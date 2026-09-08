import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";
import {
  AUDIT_SOURCES,
  CONDITIONS,
  HOLD_EXPIRY_HOURS,
  ILLUMINATION,
  PRODUCTION_MATERIALS,
  cancellationPenaltyPct,
  mediaPlanMetrics,
  productionQuote,
  siteScore,
  type ChangeType,
} from "@/lib/ooh/standards";

// Traditional OOH services (media planning, holds, production, proof of
// posting, audits, permits, change requests) for the signed-in Pi user.

const KINDS = [
  "media_plans",
  "inventory_holds",
  "production_orders",
  "posting_proofs",
  "site_audits",
  "site_permits",
  "campaign_change_requests",
] as const;
type Kind = (typeof KINDS)[number];

const OWNER_COL: Record<Kind, "advertiser_pi_uid" | "pi_uid"> = {
  media_plans: "advertiser_pi_uid",
  inventory_holds: "advertiser_pi_uid",
  production_orders: "advertiser_pi_uid",
  posting_proofs: "pi_uid",
  site_audits: "pi_uid",
  site_permits: "pi_uid",
  campaign_change_requests: "advertiser_pi_uid",
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const short = z.string().trim().min(1).max(120);
const notes = z.string().trim().max(1000).optional();
const uuid = z.string().uuid().optional();

const Schemas = {
  media_plans: z.object({
    campaign_name: short,
    markets: z.array(z.string().trim().max(80)).max(30),
    target_population: z.number().int().positive().max(5_000_000_000),
    flight_start: date,
    flight_end: date,
    budget_pi: z.number().positive().max(10_000_000),
    cpm_pi: z.number().positive().max(10_000),
    notes,
  }),
  inventory_holds: z.object({
    location_id: uuid,
    location_name: short,
    hold_start: date,
    hold_end: date,
    notes,
  }),
  production_orders: z.object({
    location_id: uuid,
    location_name: short,
    material: z.enum(PRODUCTION_MATERIALS.map((m) => m.id) as [string, ...string[]]),
    width_m: z.number().positive().max(500),
    height_m: z.number().positive().max(500),
    quantity: z.number().int().min(1).max(500),
    install_date: date,
    removal_date: date.optional(),
    notes,
  }),
  posting_proofs: z.object({
    production_order_id: uuid,
    location_id: uuid,
    location_name: short,
    photo_url: z.string().url().max(2000).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    notes,
  }),
  site_audits: z.object({
    location_id: uuid,
    location_name: short,
    audit_source: z.enum(AUDIT_SOURCES as [string, ...string[]]),
    illumination: z.enum(ILLUMINATION as [string, ...string[]]),
    condition: z.enum(CONDITIONS as [string, ...string[]]),
    obstruction_pct: z.number().min(0).max(100),
    daily_traffic: z.number().int().min(0).max(50_000_000),
    audited_at: date,
    notes,
  }),
  site_permits: z.object({
    location_id: uuid,
    location_name: short,
    authority: short,
    permit_number: short,
    issued_on: date,
    expires_on: date,
    notes,
  }),
  campaign_change_requests: z.object({
    booking_id: uuid,
    reference: short,
    change_type: z.enum(["cancel", "renew", "extend", "reschedule"]),
    effective_date: date,
    new_end_date: date.optional(),
    contract_value_pi: z.number().min(0).max(10_000_000).default(0),
    reason: notes,
  }),
};

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export const Route = createFileRoute("/api/public/pi-ooh-services")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const kind = new URL(request.url).searchParams.get("kind") as Kind | null;
        if (!kind || !KINDS.includes(kind)) return Response.json({ error: "Invalid kind" }, { status: 400 });

        // Table is chosen at runtime from a fixed allow-list; the generated
        // client can't narrow the column union across tables, so cast once.
        const { data, error } = await supabaseAdmin
          .from(kind as "media_plans")
          .select("*")
          .eq(OWNER_COL[kind] as "advertiser_pi_uid", user.uid)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) {
          console.error("[pi-ooh-services] list failed", kind, error);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
        return Response.json({ items: data ?? [] });
      },

      POST: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const raw = (await request.json().catch(() => null)) as { kind?: Kind; payload?: unknown } | null;
        const kind = raw?.kind;
        if (!kind || !KINDS.includes(kind)) return Response.json({ error: "Invalid kind" }, { status: 400 });

        const parsed = Schemas[kind].safeParse(raw?.payload);
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

        try {
          switch (kind) {
            case "media_plans": {
              const d = parsed.data as z.infer<typeof Schemas.media_plans>;
              if (d.flight_end <= d.flight_start) return Response.json({ error: "Flight end must be after start" }, { status: 400 });
              const m = mediaPlanMetrics({ budgetPi: d.budget_pi, cpmPi: d.cpm_pi, targetPopulation: d.target_population });
              const { data, error } = await supabaseAdmin
                .from("media_plans")
                .insert({
                  advertiser_pi_uid: user.uid,
                  advertiser_pi_username: user.username,
                  campaign_name: d.campaign_name,
                  markets: d.markets,
                  target_population: d.target_population,
                  flight_start: d.flight_start,
                  flight_end: d.flight_end,
                  budget_pi: d.budget_pi,
                  cpm_pi: d.cpm_pi,
                  planned_impressions: m.impressions,
                  grps: m.grps,
                  reach_pct: m.reachPct,
                  avg_frequency: m.frequency,
                  notes: d.notes ?? null,
                })
                .select("id")
                .single();
              if (error) throw error;
              return Response.json({ ok: true, id: data.id, metrics: m });
            }
            case "inventory_holds": {
              const d = parsed.data as z.infer<typeof Schemas.inventory_holds>;
              if (d.hold_end < d.hold_start) return Response.json({ error: "Hold end must be after start" }, { status: 400 });
              const { data, error } = await supabaseAdmin
                .from("inventory_holds")
                .insert({
                  advertiser_pi_uid: user.uid,
                  advertiser_pi_username: user.username,
                  location_id: d.location_id ?? null,
                  location_name: d.location_name,
                  hold_start: d.hold_start,
                  hold_end: d.hold_end,
                  expires_at: new Date(Date.now() + HOLD_EXPIRY_HOURS * 3_600_000).toISOString(),
                  notes: d.notes ?? null,
                })
                .select("id")
                .single();
              if (error) throw error;
              return Response.json({ ok: true, id: data.id });
            }
            case "production_orders": {
              const d = parsed.data as z.infer<typeof Schemas.production_orders>;
              const q = productionQuote({ material: d.material, widthM: d.width_m, heightM: d.height_m, quantity: d.quantity });
              const num = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
              const { data, error } = await supabaseAdmin
                .from("production_orders")
                .insert({
                  order_number: num,
                  advertiser_pi_uid: user.uid,
                  advertiser_pi_username: user.username,
                  location_id: d.location_id ?? null,
                  location_name: d.location_name,
                  material: d.material,
                  width_m: d.width_m,
                  height_m: d.height_m,
                  quantity: d.quantity,
                  install_date: d.install_date,
                  removal_date: d.removal_date ?? null,
                  production_cost_pi: q.production,
                  install_cost_pi: q.install,
                  total_pi: q.total,
                  notes: d.notes ?? null,
                })
                .select("id")
                .single();
              if (error) throw error;
              return Response.json({ ok: true, id: data.id, quote: q, order_number: num });
            }
            case "posting_proofs": {
              const d = parsed.data as z.infer<typeof Schemas.posting_proofs>;
              const { data, error } = await supabaseAdmin
                .from("posting_proofs")
                .insert({
                  pi_uid: user.uid,
                  pi_username: user.username,
                  production_order_id: d.production_order_id ?? null,
                  location_id: d.location_id ?? null,
                  location_name: d.location_name,
                  photo_url: d.photo_url ?? null,
                  lat: d.lat ?? null,
                  lng: d.lng ?? null,
                  notes: d.notes ?? null,
                })
                .select("id, posted_at")
                .single();
              if (error) throw error;
              // Anchor the proof in the tamper-evident ledger.
              const { data: hash } = await supabaseAdmin.rpc("ledger_append", {
                p_kind: "posting_proof",
                p_table: "posting_proofs",
                p_ref_id: data.id,
                p_payload: { location: d.location_name, posted_at: data.posted_at, photo_url: d.photo_url ?? null, poster: user.username },
              });
              if (hash) await supabaseAdmin.from("posting_proofs").update({ ledger_hash: hash }).eq("id", data.id);
              return Response.json({ ok: true, id: data.id, ledger_hash: hash ?? null });
            }
            case "site_audits": {
              const d = parsed.data as z.infer<typeof Schemas.site_audits>;
              const score = siteScore({ condition: d.condition, obstructionPct: d.obstruction_pct, illumination: d.illumination });
              const { data, error } = await supabaseAdmin
                .from("site_audits")
                .insert({
                  pi_uid: user.uid,
                  pi_username: user.username,
                  location_id: d.location_id ?? null,
                  location_name: d.location_name,
                  audit_source: d.audit_source,
                  illumination: d.illumination,
                  condition: d.condition,
                  obstruction_pct: d.obstruction_pct,
                  daily_traffic: d.daily_traffic,
                  score,
                  audited_at: d.audited_at,
                  notes: d.notes ?? null,
                })
                .select("id")
                .single();
              if (error) throw error;
              return Response.json({ ok: true, id: data.id, score });
            }
            case "site_permits": {
              const d = parsed.data as z.infer<typeof Schemas.site_permits>;
              if (d.expires_on <= d.issued_on) return Response.json({ error: "Expiry must be after issue date" }, { status: 400 });
              const { data, error } = await supabaseAdmin
                .from("site_permits")
                .insert({
                  pi_uid: user.uid,
                  pi_username: user.username,
                  location_id: d.location_id ?? null,
                  location_name: d.location_name,
                  authority: d.authority,
                  permit_number: d.permit_number,
                  issued_on: d.issued_on,
                  expires_on: d.expires_on,
                  status: d.expires_on < new Date().toISOString().slice(0, 10) ? "expired" : "active",
                  notes: d.notes ?? null,
                })
                .select("id")
                .single();
              if (error) throw error;
              return Response.json({ ok: true, id: data.id });
            }
            case "campaign_change_requests": {
              const d = parsed.data as z.infer<typeof Schemas.campaign_change_requests>;
              const notice = daysBetween(new Date().toISOString().slice(0, 10), d.effective_date);
              const pct = cancellationPenaltyPct(d.change_type as ChangeType, notice);
              const penalty = Math.round(d.contract_value_pi * pct) / 100;
              const { data, error } = await supabaseAdmin
                .from("campaign_change_requests")
                .insert({
                  advertiser_pi_uid: user.uid,
                  advertiser_pi_username: user.username,
                  booking_id: d.booking_id ?? null,
                  reference: d.reference,
                  change_type: d.change_type,
                  effective_date: d.effective_date,
                  new_end_date: d.new_end_date ?? null,
                  reason: d.reason ?? null,
                  penalty_pct: pct,
                  penalty_pi: penalty,
                })
                .select("id")
                .single();
              if (error) throw error;
              return Response.json({ ok: true, id: data.id, penalty_pct: pct, penalty_pi: penalty });
            }
          }
        } catch (err) {
          console.error("[pi-ooh-services] insert failed", kind, err);
          return Response.json({ error: "Insert failed" }, { status: 500 });
        }
        return Response.json({ error: "Invalid kind" }, { status: 400 });
      },
    },
  },
});
