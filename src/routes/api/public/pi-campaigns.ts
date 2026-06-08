import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeCost, PLACEMENTS } from "@/lib/pi/pricing";

const PI_API_BASE = "https://api.minepi.com/v2";

async function verifyPiUser(accessToken: string): Promise<{ uid: string; username: string } | null> {
  try {
    const res = await fetch(`${PI_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { uid?: string; username?: string };
    if (!data.uid || !data.username) return null;
    return { uid: data.uid, username: data.username };
  } catch {
    return null;
  }
}

function bearer(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

const PlacementSchema = z.enum(PLACEMENTS.map((p) => p.id) as [string, ...string[]]);

const PurchaseSchema = z.object({
  title: z.string().trim().min(1).max(80),
  placement: PlacementSchema,
  durationDays: z.number().int().min(1).max(365),
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
          const { title, placement, durationDays } = parsed.data;
          const cost = computeCost(placement as never, durationDays);
          if (cost <= 0) {
            return Response.json({ error: "Invalid pricing" }, { status: 400 });
          }

          const { data, error } = await supabaseAdmin.rpc("purchase_ad_campaign", {
            p_pi_uid: user.uid,
            p_pi_username: user.username,
            p_title: title,
            p_placement: placement,
            p_duration_days: durationDays,
            p_cost_pi: cost,
          });
          if (error) {
            const msg = (error.message || "").toLowerCase();
            if (msg.includes("insufficient_balance")) {
              return Response.json({ error: "Insufficient Pi balance" }, { status: 402 });
            }
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
            balance: Number(row?.new_balance ?? 0),
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
