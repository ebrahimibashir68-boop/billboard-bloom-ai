export type Placement = "stadium" | "arena" | "racetrack" | "esports";

export const PLACEMENTS: { id: Placement; label: string; multiplier: number; blurb: string }[] = [
  { id: "stadium", label: "Stadium", multiplier: 3, blurb: "Premium — 60k+ live audience" },
  { id: "arena", label: "Arena", multiplier: 2, blurb: "Indoor venues, 15-25k" },
  { id: "racetrack", label: "Racetrack", multiplier: 2.5, blurb: "Motorsport + broadcast" },
  { id: "esports", label: "Esports", multiplier: 1, blurb: "Online streams, entry tier" },
];

export const BASE_PI_PER_DAY = 5;

export function computeCost(placement: Placement, days: number): number {
  const p = PLACEMENTS.find((x) => x.id === placement);
  if (!p || days <= 0) return 0;
  return Math.round(BASE_PI_PER_DAY * p.multiplier * days * 100) / 100;
}
