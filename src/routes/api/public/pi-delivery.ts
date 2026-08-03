import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";
import {
  discrepancyPct,
  effectiveCpm,
  estimateImpressions,
  needsMakeGood,
  round4,
  shortfallCredit,
} from "@/lib/ooh/standards";

const ReconcileSchema = z.object({ booking_id: z.string().uuid() });

function creditNoteNumber(invoiceNumber: string): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CN-${invoiceNumber.replace(/^INV-/, "")}-${rand}`;
}

export const Route = createFileRoute("/api/public/pi-delivery")({
  server: {
    handlers: {
      // Delivery vs. booked impressions for the signed-in advertiser.
      GET: async ({ request }) => {
        const token = bearer(request);
        const user = token ? await verifyPiUser(token) : null;
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select(
            "id, starts_at, hours, status, total_pi, cpm_pi, booked_impressions, delivered_impressions, location_id, billboard_locations(name, city, country, daily_impressions, cpm_pi, openooh_venue_type_id)",
          )
          .eq("advertiser_pi_uid", user.uid)
          .order("starts_at", { ascending: false })
          .limit(60);

        const { data: reports } = await supabaseAdmin
          .from("delivery_reports")
          .select(
            "id, booking_id, report_date, booked_impressions, delivered_impressions, plays, cpm_pi, spend_pi, discrepancy_pct, created_at",
          )
          .eq("advertiser_pi_uid", user.uid)
          .order("report_date", { ascending: false })
          .limit(200);

        const { data: credits } = await supabaseAdmin
          .from("credit_notes")
          .select("id, credit_note_number, invoice_id, amount_pi, reason, status, issued_at")
          .eq("advertiser_pi_uid", user.uid)
          .order("issued_at", { ascending: false })
          .limit(50);

        return Response.json({
          bookings: bookings ?? [],
          reports: reports ?? [],
          credit_notes: credits ?? [],
        });
      },

      // Reconcile a booking: measure delivered impressions from proof-of-play
      // rows, write a delivery report, and raise a credit note on shortfall.
      POST: async ({ request }) => {
        const token = bearer(request);
        const user = token ? await verifyPiUser(token) : null;
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = ReconcileSchema.safeParse(payload);
        if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select(
            "id, advertiser_pi_uid, advertiser_pi_username, starts_at, hours, total_pi, quoted_pi, cpm_pi, booked_impressions, location_id, invoice_id, billboard_locations(daily_impressions, viewability_pct, partner_id)",
          )
          .eq("id", parsed.data.booking_id)
          .maybeSingle();

        if (!booking || booking.advertiser_pi_uid !== user.uid) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        const loc = booking.billboard_locations as unknown as {
          daily_impressions: number;
          viewability_pct: number | null;
          partner_id: string | null;
        } | null;

        const startHour = new Date(booking.starts_at).getUTCHours();
        const booked =
          Number(booking.booked_impressions ?? 0) > 0
            ? Number(booking.booked_impressions)
            : estimateImpressions({
                dailyImpressions: Number(loc?.daily_impressions ?? 0),
                hours: Number(booking.hours ?? 0),
                startHour,
                viewabilityPct: loc?.viewability_pct ?? undefined,
              });

        const { data: plays } = await supabaseAdmin
          .from("plays")
          .select("impressions")
          .eq("booking_id", booking.id)
          .limit(5000);

        const delivered = (plays ?? []).reduce((s, p) => s + Number(p.impressions ?? 0), 0);
        const spend = Number(booking.total_pi ?? 0);
        const variance = discrepancyPct(booked, delivered);

        await supabaseAdmin.from("delivery_reports").insert({
          booking_id: booking.id,
          partner_id: loc?.partner_id ?? null,
          advertiser_pi_uid: user.uid,
          booked_impressions: booked,
          delivered_impressions: delivered,
          plays: (plays ?? []).length,
          cpm_pi: effectiveCpm(spend, delivered),
          spend_pi: spend,
          discrepancy_pct: variance,
        });

        await supabaseAdmin
          .from("bookings")
          .update({ booked_impressions: booked, delivered_impressions: delivered })
          .eq("id", booking.id);

        let creditNote: { credit_note_number: string; amount_pi: number } | null = null;

        if (booking.invoice_id && needsMakeGood(booked, delivered)) {
          const { data: invoice } = await supabaseAdmin
            .from("invoices")
            .select("id, invoice_number, partner_id, credited_total_pi, total_pi")
            .eq("id", booking.invoice_id)
            .maybeSingle();

          if (invoice) {
            const amount = shortfallCredit({ booked, delivered, spendPi: spend });
            const alreadyCredited = Number(invoice.credited_total_pi ?? 0);
            const remaining = round4(
              Math.min(amount, Math.max(0, Number(invoice.total_pi ?? 0) - alreadyCredited)),
            );

            if (remaining > 0) {
              const number = creditNoteNumber(invoice.invoice_number);
              const { error: cnError } = await supabaseAdmin.from("credit_notes").insert({
                credit_note_number: number,
                invoice_id: invoice.id,
                partner_id: invoice.partner_id,
                advertiser_pi_uid: user.uid,
                advertiser_pi_username: booking.advertiser_pi_username,
                amount_pi: remaining,
                reason: "under_delivery",
                notes: `Delivered ${delivered.toLocaleString()} of ${booked.toLocaleString()} booked impressions (${variance}%).`,
                status: "issued",
              });
              if (!cnError) {
                await supabaseAdmin
                  .from("invoices")
                  .update({ credited_total_pi: round4(alreadyCredited + remaining) })
                  .eq("id", invoice.id);
                creditNote = { credit_note_number: number, amount_pi: remaining };
              }
            }
          }
        }

        return Response.json({
          ok: true,
          booked_impressions: booked,
          delivered_impressions: delivered,
          discrepancy_pct: variance,
          effective_cpm_pi: effectiveCpm(spend, delivered),
          credit_note: creditNote,
        });
      },
    },
  },
});
