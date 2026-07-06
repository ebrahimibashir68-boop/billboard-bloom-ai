// AI-powered venue matcher for smart contract billboard ads.
// Falls back to a deterministic pick if the AI Gateway is unavailable so a
// contract activation never blocks on the model.
import { generateObject } from "ai";
import { z } from "zod";
import { chatModel } from "@/lib/ai-gateway.server";
import type { Placement } from "@/lib/pi/pricing";
import type { ContractTier } from "@/lib/pi/contracts";

export interface VenueCatalogEntry {
  code: string;
  name: string;
  sport: string;
  placement: Placement;
  region: string;
}

// Seed catalog — mirrors dashboard venues plus regional coverage. Extend later
// with a real DB-backed catalog.
export const VENUE_CATALOG: VenueCatalogEntry[] = [
  { code: "MNU", name: "Old Trafford, Manchester", sport: "Soccer", placement: "stadium", region: "EU" },
  { code: "BAR", name: "Camp Nou, Barcelona", sport: "Soccer", placement: "stadium", region: "EU" },
  { code: "MAD", name: "Santiago Bernabéu, Madrid", sport: "Soccer", placement: "stadium", region: "EU" },
  { code: "MUN", name: "Allianz Arena, Munich", sport: "Soccer", placement: "stadium", region: "EU" },
  { code: "LAL", name: "Crypto.com Arena, LA", sport: "Basketball", placement: "arena", region: "NA" },
  { code: "NYK", name: "Madison Square Garden, NY", sport: "Basketball", placement: "arena", region: "NA" },
  { code: "BOS", name: "TD Garden, Boston", sport: "Basketball", placement: "arena", region: "NA" },
  { code: "MON", name: "Circuit de Monaco", sport: "F1", placement: "racetrack", region: "EU" },
  { code: "SIL", name: "Silverstone Circuit", sport: "F1", placement: "racetrack", region: "EU" },
  { code: "COT", name: "Circuit of the Americas", sport: "F1", placement: "racetrack", region: "NA" },
  { code: "TYO", name: "Tokyo Dome", sport: "Baseball", placement: "stadium", region: "APAC" },
  { code: "SEO", name: "Gocheok Sky Dome, Seoul", sport: "Baseball", placement: "stadium", region: "APAC" },
  { code: "ESL", name: "ESL Katowice Arena", sport: "Esports", placement: "esports", region: "EU" },
  { code: "TIL", name: "The International, Seattle", sport: "Esports", placement: "esports", region: "NA" },
  { code: "SGP", name: "Marina Bay Street Circuit", sport: "F1", placement: "racetrack", region: "APAC" },
  { code: "SAO", name: "Maracanã, Rio de Janeiro", sport: "Soccer", placement: "stadium", region: "LATAM" },
];

const MatchSchema = z.object({
  matches: z.array(
    z.object({
      code: z.string(),
      score: z.number().min(0).max(100),
      reasoning: z.string().min(10).max(240),
    }),
  ),
});

export interface VenueMatch {
  code: string;
  name: string;
  sport: string;
  score: number;
  reasoning: string;
}

export async function matchVenues(input: {
  bodyText: string;
  placements: Placement[];
  tier: ContractTier;
  targetVenues: number;
}): Promise<VenueMatch[]> {
  const candidates = VENUE_CATALOG.filter((v) => input.placements.includes(v.placement));
  const pool = candidates.length ? candidates : VENUE_CATALOG;
  const want = Math.min(input.targetVenues, pool.length);

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
${pool.map((v) => `- ${v.code} · ${v.name} · ${v.sport} · ${v.placement} · ${v.region}`).join("\n")}`,
    });
    const byCode = new Map(pool.map((v) => [v.code, v]));
    const picked = object.matches
      .map((m) => {
        const v = byCode.get(m.code);
        if (!v) return null;
        return {
          code: v.code,
          name: v.name,
          sport: v.sport,
          score: Math.round(m.score),
          reasoning: m.reasoning,
        };
      })
      .filter((m): m is VenueMatch => m !== null)
      .slice(0, want);
    if (picked.length >= Math.min(1, want)) return picked;
  } catch (err) {
    console.warn("[match-venues] AI matcher failed, falling back", err);
  }

  // Deterministic fallback so activation never fails on AI outage.
  return pool.slice(0, want).map((v, i) => ({
    code: v.code,
    name: v.name,
    sport: v.sport,
    score: 90 - i * 3,
    reasoning: `Selected by fallback distributor for ${v.placement} placement.`,
  }));
}
