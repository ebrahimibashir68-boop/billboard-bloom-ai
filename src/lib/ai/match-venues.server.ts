// AI-powered venue matcher for smart contract billboard ads.
// Queries the DB-backed `venues` catalog (filtered to venues owned by
// approved partners) and returns matches; falls back deterministically
// if the AI Gateway is unavailable.
import { generateObject } from "ai";
import { z } from "zod";
import { chatModel } from "@/lib/ai-gateway.server";
import type { Placement } from "@/lib/pi/pricing";
import type { ContractTier } from "@/lib/pi/contracts";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface VenueMatch {
  code: string;
  name: string;
  sport: string;
  partner_id: string | null;
  score: number;
  reasoning: string;
}

const MatchSchema = z.object({
  matches: z.array(
    z.object({
      code: z.string(),
      score: z.number().min(0).max(100),
      reasoning: z.string().min(10).max(240),
    }),
  ),
});

export async function matchVenues(input: {
  bodyText: string;
  placements: Placement[];
  tier: ContractTier;
  targetVenues: number;
}): Promise<VenueMatch[]> {
  // Pull active venues from approved partners.
  const { data: venuesRaw } = await supabaseAdmin
    .from("venues")
    .select("code, name, sport, placement, region, partner_id, active, ad_partners!inner(status)")
    .eq("active", true);

  const pool = (venuesRaw ?? [])
    .filter((v) => {
      const partner = (v as unknown as { ad_partners: { status: string } | null }).ad_partners;
      return !partner || partner.status === "approved";
    })
    .map((v) => ({
      code: v.code,
      name: v.name,
      sport: v.sport,
      placement: v.placement as Placement,
      region: v.region ?? "",
      partner_id: v.partner_id ?? null,
    }));

  const candidates = pool.filter((v) => input.placements.includes(v.placement));
  const chosenPool = candidates.length ? candidates : pool;
  const want = Math.min(input.targetVenues, chosenPool.length);
  if (want === 0) return [];

  try {
    const { object } = await generateObject({
      model: chatModel,
      schema: MatchSchema,
      prompt: `You are the AI ad distributor for Pi Billboard.

Advertiser tier: ${input.tier}
Placements requested: ${input.placements.join(", ")}
Ad copy: """${input.bodyText.slice(0, 400)}"""

Pick the ${want} best venues from this catalog and score each 0-100 for
audience fit, sport relevance, and regional diversity. Return venue codes
verbatim. Short reasoning per pick.

Catalog:
${chosenPool.map((v) => `- ${v.code} · ${v.name} · ${v.sport} · ${v.placement} · ${v.region}`).join("\n")}`,
    });
    const byCode = new Map(chosenPool.map((v) => [v.code, v]));
    const picked: VenueMatch[] = [];
    for (const m of object.matches) {
      const v = byCode.get(m.code);
      if (!v) continue;
      picked.push({
        code: v.code,
        name: v.name,
        sport: v.sport,
        partner_id: v.partner_id,
        score: Math.round(m.score),
        reasoning: m.reasoning,
      });
      if (picked.length >= want) break;
    }
    if (picked.length >= Math.min(1, want)) return picked;
  } catch (err) {
    console.warn("[match-venues] AI matcher failed, falling back", err);
  }

  return chosenPool.slice(0, want).map((v, i) => ({
    code: v.code,
    name: v.name,
    sport: v.sport,
    partner_id: v.partner_id,
    score: 90 - i * 3,
    reasoning: `Selected by fallback distributor for ${v.placement} placement.`,
  }));
}
