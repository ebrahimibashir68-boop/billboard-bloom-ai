// Smart contract helpers — canonical JSON, deterministic hash, cost formula.
// Pi Network does not currently expose user-deployable on-chain smart
// contracts, so we deliver a "verifiable contract": a canonical JSON payload
// signed by the advertiser's Pi identity and anchored to a real Pi payment.
import { PLACEMENTS, type Placement } from "./pricing";

export type ContractTier = "individual" | "enterprise";

export interface DraftContract {
  tier: ContractTier;
  title: string;
  bodyText: string;
  imageUrl?: string | null;
  placements: Placement[];
  durationDays: number;
  targetVenues: number;
}

export interface CanonicalContract extends DraftContract {
  advertiser: { pi_uid: string; pi_username: string };
  cost_pi: number;
  version: 1;
  issued_at: string;
}

export const TIER_LIMITS: Record<
  ContractTier,
  { placements: [number, number]; venues: [number, number]; days: [number, number] }
> = {
  individual: { placements: [1, 1], venues: [1, 5], days: [1, 30] },
  enterprise: { placements: [1, 4], venues: [5, 50], days: [3, 90] },
};

export function computeContractCost(
  tier: ContractTier,
  placements: Placement[],
  durationDays: number,
  targetVenues: number,
): number {
  if (durationDays <= 0 || targetVenues <= 0 || placements.length === 0) return 0;
  const multSum = placements.reduce((acc, id) => {
    const p = PLACEMENTS.find((x) => x.id === id);
    return acc + (p?.multiplier ?? 0);
  }, 0);
  const base = 5 * multSum * durationDays * targetVenues;
  const tierFactor = tier === "enterprise" ? 0.85 : 1;
  return Math.round(base * tierFactor * 100) / 100;
}

export function buildCanonicalContract(
  draft: DraftContract,
  advertiser: { pi_uid: string; pi_username: string },
  cost: number,
  issuedAt: string = new Date().toISOString(),
): CanonicalContract {
  // Field order is intentional — the JSON string is what gets hashed, so a
  // stable key ordering is required for reproducible hashes across clients.
  return {
    version: 1,
    tier: draft.tier,
    title: draft.title.trim(),
    bodyText: draft.bodyText.trim(),
    imageUrl: draft.imageUrl?.trim() || null,
    placements: [...draft.placements].sort(),
    durationDays: draft.durationDays,
    targetVenues: draft.targetVenues,
    cost_pi: cost,
    advertiser,
    issued_at: issuedAt,
  };
}

export function canonicalStringify(c: CanonicalContract): string {
  // Deterministic stringify — sort keys recursively.
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = sortKeys((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(sortKeys(c));
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await (globalThis.crypto?.subtle ?? (await import("crypto")).webcrypto.subtle).digest(
    "SHA-256",
    enc,
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashContract(c: CanonicalContract): Promise<string> {
  return sha256Hex(canonicalStringify(c));
}
