// Global out-of-home (OOH/DOOH) advertising standards used across the app.
// Client-safe: pure constants and math, no server imports.
//
// References encoded here:
//  - OpenOOH Venue Taxonomy (category / child / grandchild enumeration)
//  - Standard DOOH impression measurement (audience x dwell x viewability)
//  - CPM-based trading, delivery reconciliation and make-goods
//  - Insertion-order billing terms (net terms, agency commission)

/* ------------------------------------------------------------------ */
/* OpenOOH venue taxonomy                                              */
/* ------------------------------------------------------------------ */

export interface VenueType {
  id: number;
  parent_id: number | null;
  level: "category" | "child" | "grandchild";
  name: string;
  full_path: string;
}

/** Top-level OpenOOH categories, used for filters before data loads. */
export const OPENOOH_CATEGORIES: { id: number; name: string }[] = [
  { id: 1, name: "Transit" },
  { id: 2, name: "Retail" },
  { id: 3, name: "Outdoor" },
  { id: 4, name: "Health and Beauty" },
  { id: 5, name: "Point of Care" },
  { id: 6, name: "Education" },
  { id: 7, name: "Office Buildings" },
  { id: 8, name: "Leisure" },
  { id: 9, name: "Government" },
  { id: 10, name: "Financial" },
  { id: 11, name: "Residential" },
];

export function categoryOf(venueTypeId: number | null | undefined): string | null {
  if (!venueTypeId) return null;
  const root = Number(String(venueTypeId).slice(0, venueTypeId >= 10000 ? 1 : venueTypeId >= 100 ? 1 : 2));
  return OPENOOH_CATEGORIES.find((c) => c.id === root)?.name ?? null;
}

/* ------------------------------------------------------------------ */
/* Dayparts                                                            */
/* ------------------------------------------------------------------ */

export type Daypart =
  | "early_morning"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "late_night"
  | "event";

export const DAYPARTS: {
  id: Daypart;
  label: string;
  hours: string;
  multiplier: number;
}[] = [
  { id: "early_morning", label: "Early morning", hours: "05–08", multiplier: 0.7 },
  { id: "morning", label: "Morning", hours: "08–11", multiplier: 1.0 },
  { id: "midday", label: "Midday", hours: "11–14", multiplier: 1.1 },
  { id: "afternoon", label: "Afternoon", hours: "14–17", multiplier: 1.15 },
  { id: "evening", label: "Evening", hours: "17–22", multiplier: 1.45 },
  { id: "late_night", label: "Late night", hours: "22–24", multiplier: 0.8 },
  { id: "event", label: "Live event", hours: "match window", multiplier: 2.2 },
];

export function daypartFor(hour: number): Daypart {
  if (hour >= 5 && hour < 8) return "early_morning";
  if (hour >= 8 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late_night";
}

export function daypartMultiplier(daypart: Daypart): number {
  return DAYPARTS.find((d) => d.id === daypart)?.multiplier ?? 1;
}

/* ------------------------------------------------------------------ */
/* Impression measurement + CPM trading                                */
/* ------------------------------------------------------------------ */

/** Industry default: a play is counted as an impression opportunity once
 *  the creative is on screen for the full slot within the audience window. */
export const DEFAULT_VIEWABILITY_PCT = 62;
export const DEFAULT_SLOT_SECONDS = 15;
export const PLAYS_PER_HOUR = 4;

/**
 * Standard DOOH impression estimate for a booking window.
 * dailyImpressions is the operator-published daily audience for the face.
 */
export function estimateImpressions(params: {
  dailyImpressions: number;
  hours: number;
  startHour?: number;
  viewabilityPct?: number;
}): number {
  const { dailyImpressions, hours } = params;
  if (dailyImpressions <= 0 || hours <= 0) return 0;
  const viewability = (params.viewabilityPct ?? DEFAULT_VIEWABILITY_PCT) / 100;
  const perHour = dailyImpressions / 24;
  let total = 0;
  for (let i = 0; i < hours; i++) {
    const hour = ((params.startHour ?? 12) + i) % 24;
    total += perHour * daypartMultiplier(daypartFor(hour));
  }
  return Math.round(total * viewability);
}

/** Cost of a given number of impressions at a CPM (cost per 1,000). */
export function cpmCost(impressions: number, cpmPi: number): number {
  if (impressions <= 0 || cpmPi <= 0) return 0;
  return round4((impressions / 1000) * cpmPi);
}

/** Impressions buyable with a budget at a CPM. */
export function impressionsForBudget(budgetPi: number, cpmPi: number): number {
  if (budgetPi <= 0 || cpmPi <= 0) return 0;
  return Math.floor((budgetPi / cpmPi) * 1000);
}

/** Effective CPM actually achieved once delivery is known. */
export function effectiveCpm(spendPi: number, deliveredImpressions: number): number {
  if (deliveredImpressions <= 0) return 0;
  return round4((spendPi / deliveredImpressions) * 1000);
}

/** Signed delivery variance: negative = under-delivery. */
export function discrepancyPct(booked: number, delivered: number): number {
  if (booked <= 0) return 0;
  return round4(((delivered - booked) / booked) * 100);
}

/** Industry norm: under-delivery beyond 10% triggers a make-good or credit. */
export const MAKE_GOOD_THRESHOLD_PCT = -10;

export function needsMakeGood(booked: number, delivered: number): boolean {
  return discrepancyPct(booked, delivered) <= MAKE_GOOD_THRESHOLD_PCT;
}

/** Value of the shortfall, used to size a credit note. */
export function shortfallCredit(params: {
  booked: number;
  delivered: number;
  spendPi: number;
}): number {
  const { booked, delivered, spendPi } = params;
  if (booked <= 0 || delivered >= booked) return 0;
  return round4((1 - delivered / booked) * spendPi);
}

/* ------------------------------------------------------------------ */
/* Billing terms                                                       */
/* ------------------------------------------------------------------ */

export const PAYMENT_TERMS: { id: string; label: string; days: number }[] = [
  { id: "due_on_receipt", label: "Due on receipt", days: 0 },
  { id: "net_7", label: "Net 7", days: 7 },
  { id: "net_15", label: "Net 15", days: 15 },
  { id: "net_30", label: "Net 30", days: 30 },
  { id: "net_45", label: "Net 45", days: 45 },
  { id: "net_60", label: "Net 60", days: 60 },
];

export function termDays(terms: string): number {
  return PAYMENT_TERMS.find((t) => t.id === terms)?.days ?? 7;
}

export function dueDate(issuedAt: Date | string, terms: string): Date {
  const base = typeof issuedAt === "string" ? new Date(issuedAt) : issuedAt;
  return new Date(base.getTime() + termDays(terms) * 86_400_000);
}

/** Standard media agency commission of 15% on gross unless overridden. */
export const DEFAULT_AGENCY_COMMISSION_PCT = 15;

/** Net payable to the media owner after agency commission. */
export function netFromGross(grossPi: number, commissionPct: number): number {
  return round4(grossPi * (1 - commissionPct / 100));
}

/** Platform fee charged by Pi Billboard on every booking. */
export const PLATFORM_FEE_PCT = 8;

export function platformFee(subtotalPi: number): number {
  return round4(subtotalPi * (PLATFORM_FEE_PCT / 100));
}

export function invoiceBalance(params: {
  totalPi: number;
  creditedTotalPi?: number;
}): number {
  return round4(Math.max(0, params.totalPi - (params.creditedTotalPi ?? 0)));
}

/* ------------------------------------------------------------------ */
/* Payouts                                                             */
/* ------------------------------------------------------------------ */

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  submitted: "Submitted to Pi",
  completed: "Paid in Pi",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const DEFAULT_REVENUE_SHARE_PCT = 70;

/** Media-owner share of a paid invoice. */
export function revenueShare(grossPi: number, sharePct: number): number {
  return round4(grossPi * (sharePct / 100));
}

/* ------------------------------------------------------------------ */

export function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function fmtPi(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "— π";
  return `${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} π`;
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}
