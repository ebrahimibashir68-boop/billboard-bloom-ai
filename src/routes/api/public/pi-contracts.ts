import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildCanonicalContract,
  computeContractCost,
  hashContract,
  TIER_LIMITS,
  type ContractTier,
} from "@/lib/pi/contracts";
import { PLACEMENTS, type Placement } from "@/lib/pi/pricing";
import { matchVenues } from "@/lib/ai/match-venues.server";

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

const PlacementIds = PLACEMENTS.map((p) => p.id) as [string, ...string[]];
const CreateSchema = z.object({
  tier: z.enum(["individual", "enterprise"]),
  title: z.string().trim().min(1).max(80),
  bodyText: z.string().trim().min(4).max(500),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  placements: z.array(z.enum(PlacementIds)).min(1).max(4),
  durationDays: z.number().int().min(1).max(365),
  targetVenues: z.number().int().min(1).max(50),
});

export const Route = createFileRoute("/api/public/pi-contracts")({
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

          const { data: contracts, error } = await supabaseAdmin
            .from("ad_contracts")
            .select(
              "id, tier, title, body_text, image_url, placements, duration_days, target_venues, cost_pi, contract_hash, status, activated_at, ends_at, created_at",
            )
            .eq("advertiser_pi_uid", user.uid)
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) {
            console.error("[pi-contracts] list failed", error);
            return Response.json({ error: "Internal error" }, { status: 500 });
          }
          const ids = (contracts ?? []).map((c) => c.id);
          let placementsByContract: Record<string, unknown[]> = {};
          if (ids.length) {
            const { data: placements } = await supabaseAdmin
              .from("ad_placements")
              .select("id, contract_id, venue_code, venue_name, sport, ai_match_score, ai_reasoning, scheduled_start, scheduled_end, status")
              .in("contract_id", ids);
            placementsByContract = (placements ?? []).reduce<Record<string, unknown[]>>(
              (acc, p) => {
                (acc[p.contract_id] ??= []).push(p);
                return acc;
              },
              {},
            );
          }
          return Response.json({
            contracts: (contracts ?? []).map((c) => ({
              ...c,
              placements_matched: placementsByContract[c.id] ?? [],
            })),
          });
        } catch (err) {
          console.error("[pi-contracts] GET error", err);
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
          const parsed = CreateSchema.safeParse(raw);
          if (!parsed.success) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }
          const draft = parsed.data;
          const limits = TIER_LIMITS[draft.tier as ContractTier];
          const placementsOk =
            draft.placements.length >= limits.placements[0] &&
            draft.placements.length <= limits.placements[1];
          const venuesOk =
            draft.targetVenues >= limits.venues[0] && draft.targetVenues <= limits.venues[1];
          const daysOk =
            draft.durationDays >= limits.days[0] && draft.durationDays <= limits.days[1];
          if (!placementsOk || !venuesOk || !daysOk) {
            return Response.json({ error: "Tier limits exceeded" }, { status: 400 });
          }

          const cost = computeContractCost(
            draft.tier as ContractTier,
            draft.placements as Placement[],
            draft.durationDays,
            draft.targetVenues,
          );
          if (cost <= 0) return Response.json({ error: "Invalid pricing" }, { status: 400 });

          const canonical = buildCanonicalContract(
            {
              tier: draft.tier as ContractTier,
              title: draft.title,
              bodyText: draft.bodyText,
              imageUrl: draft.imageUrl ?? null,
              placements: draft.placements as Placement[],
              durationDays: draft.durationDays,
              targetVenues: draft.targetVenues,
            },
            { pi_uid: user.uid, pi_username: user.username },
            cost,
          );
          const contract_hash = await hashContract(canonical);

          // Atomically debit the Pi balance using optimistic concurrency on
          // updated_at. Concurrent contract creations for the same UID cannot
          // both succeed — the losing writer retries once.
          const debitAtomic = async (): Promise<
            { ok: true; newBalance: number } | { ok: false; reason: "insufficient" | "not_found" | "conflict" }
          > => {
            const { data: current, error: readErr } = await supabaseAdmin
              .from("pi_balances")
              .select("balance, updated_at")
              .eq("pi_uid", user.uid)
              .maybeSingle();
            if (readErr) throw readErr;
            if (!current) return { ok: false, reason: "not_found" };
            const balance = Number(current.balance);
            if (balance < cost) return { ok: false, reason: "insufficient" };
            const { data: updated, error: updErr } = await supabaseAdmin
              .from("pi_balances")
              .update({ balance: balance - cost, updated_at: new Date().toISOString() })
              .eq("pi_uid", user.uid)
              .eq("updated_at", current.updated_at)
              .select("balance")
              .maybeSingle();
            if (updErr) throw updErr;
            if (!updated) return { ok: false, reason: "conflict" };
            return { ok: true, newBalance: Number(updated.balance) };
          };

          let debit = await debitAtomic();
          if (!debit.ok && debit.reason === "conflict") debit = await debitAtomic();
          if (!debit.ok) {
            if (debit.reason === "insufficient" || debit.reason === "not_found") {
              return Response.json({ error: "Insufficient Pi balance" }, { status: 402 });
            }
            return Response.json({ error: "Payment race — please retry" }, { status: 409 });
          }

          const endsAt = new Date(Date.now() + draft.durationDays * 24 * 60 * 60 * 1000);
          const { data: inserted, error: insErr } = await supabaseAdmin
            .from("ad_contracts")
            .insert({
              advertiser_pi_uid: user.uid,
              advertiser_pi_username: user.username,
              tier: draft.tier,
              title: draft.title,
              body_text: draft.bodyText,
              image_url: draft.imageUrl ?? null,
              placements: draft.placements,
              duration_days: draft.durationDays,
              target_venues: draft.targetVenues,
              cost_pi: cost,
              contract_hash,
              contract_json: canonical as unknown as Record<string, unknown>,

              status: "active",
              activated_at: new Date().toISOString(),
              ends_at: endsAt.toISOString(),
            })
            .select("id")
            .single();
          if (insErr || !inserted) {
            console.error("[pi-contracts] insert failed", insErr);
            // Best-effort refund
            await supabaseAdmin.rpc("credit_pi_balance", {
              p_pi_uid: user.uid,
              p_pi_username: user.username,
              p_amount: cost,
            });
            return Response.json({ error: "Contract creation failed" }, { status: 500 });
          }

          // AI venue matching + schedule seed.
          const matches = await matchVenues({
            bodyText: draft.bodyText,
            placements: draft.placements as Placement[],
            tier: draft.tier as ContractTier,
            targetVenues: draft.targetVenues,
          });
          const start = Date.now();
          const slotMs = Math.max(
            (draft.durationDays * 24 * 60 * 60 * 1000) / Math.max(matches.length, 1),
            60 * 60 * 1000,
          );
          const placementRows = matches.map((m, i) => ({
            contract_id: inserted.id,
            venue_code: m.code,
            venue_name: m.name,
            sport: m.sport,
            ai_match_score: m.score,
            ai_reasoning: m.reasoning,
            scheduled_start: new Date(start + i * slotMs).toISOString(),
            scheduled_end: new Date(start + (i + 1) * slotMs).toISOString(),
            status: i === 0 ? "playing" : "scheduled",
          }));
          if (placementRows.length) {
            const { error: pErr } = await supabaseAdmin.from("ad_placements").insert(placementRows);
            if (pErr) console.error("[pi-contracts] placements insert failed", pErr);
          }

          return Response.json({
            ok: true,
            contractId: inserted.id,
            hash: contract_hash,
            cost,
            balance: debit.newBalance,
            matches,
          });
        } catch (err) {
          console.error("[pi-contracts] POST error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
