import { z } from "zod";

export const WORK_CATEGORIES = [
  { id: "site_rights", label: "Site rights & leases" },
  { id: "engineering", label: "Survey & engineering" },
  { id: "logistics", label: "Print, freight & installation" },
  { id: "maintenance", label: "Maintenance & outages" },
  { id: "compliance", label: "Permits, safety & insurance" },
  { id: "makegood", label: "Makegoods & disputes" },
  { id: "decommission", label: "Removal & restoration" },
] as const;

export const WORK_STATUSES = ["draft", "submitted", "in_progress", "evidence_submitted", "completed", "cancelled"] as const;
export type WorkStatus = typeof WORK_STATUSES[number];
export const STATUS_LABELS: Record<WorkStatus, string> = {
  draft: "Draft", submitted: "Submitted", in_progress: "In progress",
  evidence_submitted: "Evidence submitted", completed: "Owner accepted", cancelled: "Cancelled",
};
export const TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
  draft: ["submitted", "cancelled"], submitted: ["in_progress", "cancelled"],
  in_progress: ["evidence_submitted", "cancelled"], evidence_submitted: ["completed", "in_progress", "cancelled"],
  completed: [], cancelled: [],
};

const short = z.string().trim().min(1).max(160);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid date");
export const WorkOrderSchema = z.object({
  category: z.enum(WORK_CATEGORIES.map((item) => item.id)),
  title: short, site_name: short, market: short, due_on: date,
  reference: z.string().trim().max(160).optional(), supplier: z.string().trim().max(160).optional(),
  budget_pi: z.number().finite().min(0).max(10_000_000).default(0),
  description: z.string().trim().max(4000).default(""),
});
export const TransitionSchema = z.object({
  id: z.string().uuid(), version: z.number().int().positive(), status: z.enum(WORK_STATUSES),
  note: z.string().trim().min(1).max(2000),
  evidence_url: z.string().url().max(2000).refine((value) => new URL(value).protocol === "https:", "HTTPS evidence required").optional(),
}).refine((value) => value.status !== "evidence_submitted" || !!value.evidence_url, "Evidence URL required");

export function canTransition(from: WorkStatus, to: WorkStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const SERVICE_LINKS = [
  { to: "/locations", label: "Inventory & site selection", stage: "Discover" },
  { to: "/services", label: "Media planning, holds & permits", stage: "Plan" },
  { to: "/rfps", label: "Agency briefs & procurement", stage: "Procure" },
  { to: "/studio-design", label: "Text, image & video production", stage: "Create" },
  { to: "/contracts", label: "Verifiable advertising agreements", stage: "Agree" },
  { to: "/bookings", label: "Insertion orders & Pi invoices", stage: "Book" },
  { to: "/partner", label: "Operator review & approvals", stage: "Approve" },
  { to: "/displayer", label: "Screen scheduling & proof of play", stage: "Deliver" },
  { to: "/measurement", label: "Delivery reconciliation & credit notes", stage: "Measure" },
  { to: "/live", label: "Sponsorship, transit & auctions", stage: "Expand" },
  { to: "/payouts", label: "Partner Pi payouts", stage: "Settle" },
  { to: "/ledger", label: "Tamper-evident record history", stage: "Audit" },
] as const;