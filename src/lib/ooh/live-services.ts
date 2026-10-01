// Client-safe constants and pricing for sponsorships, transit / street
// furniture placements and live screen-time auctions.
import { round4 } from "./standards";

export const SPONSOR_PROPERTIES = [
  { id: "stadium_naming", label: "Stadium naming rights", baseAnnualPi: 50000, mediaMultiplier: 2.4 },
  { id: "team_kit", label: "Team / kit sponsorship", baseAnnualPi: 25000, mediaMultiplier: 2.1 },
  { id: "event_title", label: "Event title sponsor", baseAnnualPi: 15000, mediaMultiplier: 1.9 },
  { id: "league_partner", label: "League official partner", baseAnnualPi: 30000, mediaMultiplier: 2.0 },
  { id: "concert_tour", label: "Concert / festival tour", baseAnnualPi: 10000, mediaMultiplier: 1.7 },
  { id: "perimeter_led", label: "Perimeter LED season package", baseAnnualPi: 6000, mediaMultiplier: 1.5 },
] as const;

export const RIGHTS_PACKAGES = [
  { id: "bronze", label: "Bronze — signage only", factor: 0.5 },
  { id: "silver", label: "Silver — signage + digital", factor: 0.8 },
  { id: "gold", label: "Gold — signage, digital, hospitality", factor: 1 },
  { id: "platinum", label: "Platinum — full activation rights", factor: 1.5 },
] as const;

export const EXCLUSIVITY = [
  { id: "none", label: "Non-exclusive", factor: 0.85 },
  { id: "category", label: "Category exclusive", factor: 1 },
  { id: "full", label: "Fully exclusive", factor: 1.4 },
] as const;

export function sponsorshipQuote(p: { property: string; pkg: string; exclusivity: string; years: number }) {
  const prop = SPONSOR_PROPERTIES.find((x) => x.id === p.property);
  const pkg = RIGHTS_PACKAGES.find((x) => x.id === p.pkg);
  const ex = EXCLUSIVITY.find((x) => x.id === p.exclusivity);
  if (!prop || !pkg || !ex || p.years <= 0) return { annual: 0, total: 0, mediaValue: 0 };
  const annual = round4(prop.baseAnnualPi * pkg.factor * ex.factor);
  // Multi-year commitments earn the customary 5% per extra year, capped at 20%.
  const discount = Math.min(0.2, 0.05 * (Math.ceil(p.years) - 1));
  const total = round4(annual * p.years * (1 - discount));
  return { annual, total, mediaValue: round4(total * prop.mediaMultiplier) };
}

export const TRANSIT_FORMATS = [
  { id: "bus_shelter", label: "Bus shelter (6-sheet)", unitWeekPi: 18, weeklyImpressions: 9000 },
  { id: "bus_wrap", label: "Full bus wrap", unitWeekPi: 120, weeklyImpressions: 40000 },
  { id: "metro_platform", label: "Metro platform poster", unitWeekPi: 25, weeklyImpressions: 15000 },
  { id: "metro_digital", label: "Metro digital screen", unitWeekPi: 45, weeklyImpressions: 22000 },
  { id: "airport_digital", label: "Airport digital screen", unitWeekPi: 90, weeklyImpressions: 30000 },
  { id: "kiosk", label: "Street kiosk / totem", unitWeekPi: 15, weeklyImpressions: 7000 },
  { id: "taxi_top", label: "Taxi / rideshare top", unitWeekPi: 12, weeklyImpressions: 5000 },
  { id: "train_interior", label: "Train interior card", unitWeekPi: 6, weeklyImpressions: 2500 },
] as const;

export function transitQuote(p: { format: string; units: number; weeks: number }) {
  const f = TRANSIT_FORMATS.find((x) => x.id === p.format);
  if (!f || p.units <= 0 || p.weeks <= 0) return { rate: 0, total: 0, weeklyImpressions: 0 };
  // Volume discount: 10% from 25 units, 20% from 100 units.
  const vol = p.units >= 100 ? 0.8 : p.units >= 25 ? 0.9 : 1;
  const rate = round4(f.unitWeekPi * vol);
  return { rate, total: round4(rate * p.units * p.weeks), weeklyImpressions: f.weeklyImpressions * p.units };
}
