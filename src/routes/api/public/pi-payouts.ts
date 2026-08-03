import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";
import {
  createA2UPayment,
  completeA2UPayment,
  payoutNumber,
  walletConfigured,
  PAYMENT_ID_RE,
  TXID_RE,
} from "@/lib/pi/payouts.server";
import { revenueShare, round4 } from "@/lib/ooh/standards";

const RequestSchema = z.object({
  action: z.literal("request"),
  partner_id: z.string().uuid(),
  amount_pi: z.number().positive().max(1_000_000).optional(),
});

const SettleSchema = z.object({
  action: z.literal("settle"),
  payout_id: z.string().uuid(),
  txid: z.string().regex(TXID_RE),
});

const BodySchema = z.union([RequestSchema, SettleSchema]);

export const Route = createFileRoute("/api/public/pi-payouts")({
  server: {
    handlers: {
      // Earnings + payout history for the signed-in Pi partner.
      GET: async ({ request }) => {
        const token = bearer(request);
        const user = token ? await verifyPiUser(token) : null;
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: partners } = await supabaseAdmin
          .from("ad_partners")
          .select("id, company_name, revenue_share_pct, payment_terms, min_payout_pi, status")
          .eq("owner_pi_uid", user.uid);

        const partnerIds = (partners ?? []).map((p) => p.id);

        const { data: payouts } = await supabaseAdmin
          .from("pi_payouts")
          .select(
            "id, payout_number, partner_id, amount_pi, gross_pi, revenue_share_pct, kind, status, pi_txid, period_start, period_end, failure_reason, created_at, completed_at",
          )
          .eq("recipient_pi_uid", user.uid)
          .order("created_at", { ascending: false })
          .limit(100);

        const earnings: Record<
          string,
          { gross: number; earned: number; paidOut: number; available: number }
        > = {};

        if (partnerIds.length) {
          const { data: invoices } = await supabaseAdmin
            .from("invoices")
            .select("partner_id, total_pi, credited_total_pi, status")
            .in("partner_id", partnerIds)
            .eq("status", "paid");

          for (const p of partners ?? []) {
            const gross = (invoices ?? [])
              .filter((i) => i.partner_id === p.id)
              .reduce(
                (s, i) => s + Number(i.total_pi ?? 0) - Number(i.credited_total_pi ?? 0),
                0,
              );
            const earned = revenueShare(gross, Number(p.revenue_share_pct ?? 70));
            const paidOut = (payouts ?? [])
              .filter(
                (x) =>
                  x.partner_id === p.id && x.status !== "failed" && x.status !== "cancelled",
              )
              .reduce((s, x) => s + Number(x.amount_pi ?? 0), 0);
            earnings[p.id] = {
              gross: round4(gross),
              earned,
              paidOut: round4(paidOut),
              available: round4(Math.max(0, earned - paidOut)),
            };
          }
        }

        return Response.json({
          partners: partners ?? [],
          payouts: payouts ?? [],
          earnings,
          wallet_ready: walletConfigured(),
        });
      },

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
        const parsed = BodySchema.safeParse(payload);
        if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (parsed.data.action === "settle") {
          const { data: payout } = await supabaseAdmin
            .from("pi_payouts")
            .select("id, pi_payment_id, status, recipient_pi_uid")
            .eq("id", parsed.data.payout_id)
            .maybeSingle();
          if (!payout || payout.recipient_pi_uid !== user.uid) {
            return Response.json({ error: "Not found" }, { status: 404 });
          }
          if (!payout.pi_payment_id || !PAYMENT_ID_RE.test(payout.pi_payment_id)) {
            return Response.json({ error: "Payout has no Pi payment" }, { status: 409 });
          }
          const res = await completeA2UPayment(payout.pi_payment_id, parsed.data.txid);
          if (!res.ok) {
            await supabaseAdmin
              .from("pi_payouts")
              .update({ status: "failed", failure_reason: res.error ?? "complete_failed" })
              .eq("id", payout.id);
            return Response.json({ error: "Settlement failed" }, { status: 502 });
          }
          await supabaseAdmin
            .from("pi_payouts")
            .update({
              status: "completed",
              pi_txid: parsed.data.txid,
              completed_at: new Date().toISOString(),
              failure_reason: null,
            })
            .eq("id", payout.id);
          return Response.json({ ok: true });
        }

        // action === "request"
        const { data: partner } = await supabaseAdmin
          .from("ad_partners")
          .select(
            "id, company_name, revenue_share_pct, min_payout_pi, owner_pi_uid, payout_wallet_address, status",
          )
          .eq("id", parsed.data.partner_id)
          .maybeSingle();

        if (!partner || partner.owner_pi_uid !== user.uid) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        if (partner.status !== "approved") {
          return Response.json({ error: "Partner not approved yet" }, { status: 403 });
        }

        const { data: invoices } = await supabaseAdmin
          .from("invoices")
          .select("total_pi, credited_total_pi")
          .eq("partner_id", partner.id)
          .eq("status", "paid");

        const gross = (invoices ?? []).reduce(
          (s, i) => s + Number(i.total_pi ?? 0) - Number(i.credited_total_pi ?? 0),
          0,
        );
        const sharePct = Number(partner.revenue_share_pct ?? 70);
        const earned = revenueShare(gross, sharePct);

        const { data: prior } = await supabaseAdmin
          .from("pi_payouts")
          .select("amount_pi, status")
          .eq("partner_id", partner.id);
        const paidOut = (prior ?? [])
          .filter((p) => p.status !== "failed" && p.status !== "cancelled")
          .reduce((s, p) => s + Number(p.amount_pi ?? 0), 0);

        const available = round4(Math.max(0, earned - paidOut));
        const amount = round4(Math.min(parsed.data.amount_pi ?? available, available));
        const minPayout = Number(partner.min_payout_pi ?? 1);

        if (amount < minPayout || amount <= 0) {
          return Response.json(
            { error: `Minimum payout is ${minPayout} π — available ${available} π` },
            { status: 409 },
          );
        }

        const { data: created, error } = await supabaseAdmin
          .from("pi_payouts")
          .insert({
            payout_number: payoutNumber(),
            partner_id: partner.id,
            recipient_pi_uid: user.uid,
            recipient_pi_username: user.username,
            recipient_wallet_address: partner.payout_wallet_address,
            kind: "revenue_share",
            amount_pi: amount,
            gross_pi: round4(gross),
            revenue_share_pct: sharePct,
            memo: "Pi Billboard revenue share",
            status: "pending",
          })
          .select("id, payout_number, amount_pi, status")
          .single();

        if (error || !created) {
          console.error("[pi-payouts] insert failed");
          return Response.json({ error: "Could not create payout" }, { status: 500 });
        }

        // Open the A2U payment on the Pi Platform right away.
        const a2u = await createA2UPayment({
          uid: user.uid,
          amount,
          memo: "Pi Billboard payout",
          metadata: { payout_number: created.payout_number, partner_id: partner.id },
        });

        if (a2u.ok && a2u.paymentId) {
          await supabaseAdmin
            .from("pi_payouts")
            .update({ status: "approved", pi_payment_id: a2u.paymentId })
            .eq("id", created.id);
        } else {
          await supabaseAdmin
            .from("pi_payouts")
            .update({ failure_reason: a2u.error ?? "a2u_unavailable" })
            .eq("id", created.id);
        }

        return Response.json({
          ok: true,
          payout: { ...created, status: a2u.ok ? "approved" : "pending" },
          pi_payment_opened: a2u.ok,
          wallet_ready: walletConfigured(),
        });
      },
    },
  },
});
