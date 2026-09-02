import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeCost, PLACEMENTS } from "@/lib/pi/pricing";
import {
  assertPaymentOwnedAndFunded,
  bearer,
  completePiPayment,
  SAFE_PI_ID_RE,
  verifyPiUser,
} from "@/lib/pi/platform.server";

const PlacementSchema = z.enum(PLACEMENTS.map((p) => p.id) as [string, ...string[]]);

const PurchaseSchema = z.object({
  title: z.string().trim().min(1).max(80),
  placement: PlacementSchema,
  durationDays: z.number().int().min(1).max(365),
  paymentId: z.string().min(10).max(128).regex(SAFE_PI_ID_RE),
  txid: z.string().min(10).max(128).regex(SAFE_PI_ID_RE),
});



export const Route = createFileRoute("/api/public/pi-campaigns")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const token = bearer(request);
          if (!token || token.length > 4096) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const user = await verifyPiUser(token);
          if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

          const { data, error } = await supabaseAdmin
            .from("ad_campaigns")
            .select("id, title, placement, duration_days, cost_pi, status, starts_at, ends_at, created_at")
            .eq("pi_uid", user.uid)
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) {
            console.error("[pi-campaigns] list failed", error);
            return Response.json({ error: "Internal error" }, { status: 500 });
          }
          return Response.json({ campaigns: data ?? [] });
        } catch (err) {
          console.error("[pi-campaigns] GET error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const token = bearer(request);
          if (!token || token.length > 4096) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const user = await verifyPiUser(token);
          if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

          const raw = await request.json().catch(() => null);
          const parsed = PurchaseSchema.safeParse(raw);
          if (!parsed.success) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }
          const { title, placement, durationDays, paymentId, txid } = parsed.data;
          const cost = computeCost(placement as never, durationDays);
          if (cost <= 0) {
            return Response.json({ error: "Invalid pricing" }, { status: 400 });
          }

          // Authoritative Pi Platform verification: the payment must exist,
          // belong to the caller and cover the campaign cost.
          const owned = await assertPaymentOwnedAndFunded({
            paymentId,
            uid: user.uid,
            minAmount: cost,
          });
          if (!owned.ok) {
            return Response.json({ error: owned.error }, { status: owned.status });
          }

          // Complete the payment on the Pi Platform.
          const completed = await completePiPayment(paymentId, txid);
          if (!completed) {
            return Response.json({ error: "Payment completion failed" }, { status: 400 });
          }


          const { data, error } = await supabaseAdmin.rpc("purchase_ad_campaign_with_pi", {
            p_pi_uid: user.uid,
            p_pi_username: user.username,
            p_title: title,
            p_placement: placement,
            p_duration_days: durationDays,
            p_cost_pi: cost,
            p_payment_id: paymentId,
            p_txid: txid,
          });
          if (error) {
            const msg = (error.message || "").toLowerCase();
            if (msg.includes("invalid_input")) {
              return Response.json({ error: "Invalid request" }, { status: 400 });
            }
            console.error("[pi-campaigns] rpc failed", error);
            return Response.json({ error: "Internal error" }, { status: 500 });
          }
          const row = Array.isArray(data) ? data[0] : data;
          return Response.json({
            ok: true,
            campaignId: row?.campaign_id,
            cost,
          });
        } catch (err) {
          console.error("[pi-campaigns] POST error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },

    },
  },
});
