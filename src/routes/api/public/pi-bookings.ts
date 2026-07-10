import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";

const CreateSchema = z.object({
  location_id: z.string().uuid(),
  campaign_id: z.string().uuid().nullable().optional(),
  starts_at: z.string().datetime(),
  hours: z.number().int().min(1).max(720),
});

const PaySchema = z.object({ invoice_id: z.string().uuid() });

export const Route = createFileRoute("/api/public/pi-bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select(
            "id, campaign_id, location_id, starts_at, hours, quoted_pi, platform_fee_pi, total_pi, status, invoice_id, created_at, billboard_locations(name, city, country, image_url, slug), invoices(id, invoice_number, status, total_pi, due_at, paid_at)",
          )
          .eq("advertiser_pi_uid", user.uid)
          .order("created_at", { ascending: false })
          .limit(100);

        return Response.json({ bookings: bookings ?? [] });
      },
      POST: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(request.url);
        const action = url.searchParams.get("action") ?? "create";
        const raw = await request.json().catch(() => null);

        if (action === "create") {
          const parsed = CreateSchema.safeParse(raw);
          if (!parsed.success)
            return Response.json({ error: "Invalid request" }, { status: 400 });
          const { data, error } = await supabaseAdmin.rpc("create_booking", {
            p_pi_uid: user.uid,
            p_pi_username: user.username,
            p_campaign_id: (parsed.data.campaign_id ?? null) as string,
            p_location_id: parsed.data.location_id,
            p_starts_at: parsed.data.starts_at,
            p_hours: parsed.data.hours,
          });
          if (error) {
            console.error("[pi-bookings] create", error);
            return Response.json({ error: error.message }, { status: 400 });
          }
          const row = Array.isArray(data) ? data[0] : data;
          return Response.json({ ok: true, ...row });
        }

        if (action === "pay") {
          const parsed = PaySchema.safeParse(raw);
          if (!parsed.success)
            return Response.json({ error: "Invalid request" }, { status: 400 });
          const { data, error } = await supabaseAdmin.rpc("pay_booking_invoice", {
            p_pi_uid: user.uid,
            p_invoice_id: parsed.data.invoice_id,
          });
          if (error) {
            const msg = (error.message || "").toLowerCase();
            if (msg.includes("insufficient_balance"))
              return Response.json({ error: "Insufficient Pi balance" }, { status: 402 });
            console.error("[pi-bookings] pay", error);
            return Response.json({ error: error.message }, { status: 400 });
          }
          const row = Array.isArray(data) ? data[0] : data;
          return Response.json({ ok: true, ...row });
        }

        if (action === "plays") {
          const bookingId = z.string().uuid().safeParse((raw as { booking_id?: string } | null)?.booking_id);
          if (!bookingId.success)
            return Response.json({ error: "Invalid request" }, { status: 400 });
          // Verify ownership via advertiser uid.
          const { data: bk } = await supabaseAdmin
            .from("bookings")
            .select("id, advertiser_pi_uid")
            .eq("id", bookingId.data)
            .maybeSingle();
          if (!bk || bk.advertiser_pi_uid !== user.uid)
            return Response.json({ error: "Not found" }, { status: 404 });
          const { data: plays } = await supabaseAdmin
            .from("plays")
            .select("id, played_at, impressions")
            .eq("booking_id", bookingId.data)
            .order("played_at")
            .limit(2000);
          return Response.json({ plays: plays ?? [] });
        }

        return Response.json({ error: "Unknown action" }, { status: 400 });
      },
    },
  },
});
