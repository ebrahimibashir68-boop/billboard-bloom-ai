import { describe, expect, it } from "vitest";
import { canTransition, TransitionSchema, WorkOrderSchema } from "./operations";

describe("Pi operational dossiers", () => {
  it("covers the traditional physical-site lifecycle", () => {
    for (const category of ["site_rights", "engineering", "logistics", "maintenance", "compliance", "makegood", "decommission"]) {
      expect(WorkOrderSchema.safeParse({ category, title: "Site survey", site_name: "North stand", market: "London", due_on: "2026-10-30" }).success).toBe(true);
    }
  });
  it("requires evidence before acceptance", () => {
    expect(canTransition("in_progress", "completed")).toBe(false);
    expect(canTransition("evidence_submitted", "completed")).toBe(true);
    expect(TransitionSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", version: 1, status: "evidence_submitted", note: "Installed" }).success).toBe(false);
  });
  it("keeps final records closed", () => {
    expect(canTransition("completed", "in_progress")).toBe(false);
    expect(canTransition("cancelled", "submitted")).toBe(false);
  });
  it("rejects invalid dates and negative Pi estimates", () => {
    const details = { category: "engineering", title: "Survey", site_name: "Stadium", market: "London", due_on: "2026-02-30", budget_pi: 0 };
    expect(WorkOrderSchema.safeParse(details).success).toBe(false);
    expect(WorkOrderSchema.safeParse({ ...details, due_on: "2026-10-30", budget_pi: -1 }).success).toBe(false);
  });
  it("requires secure evidence and a nonempty event note", () => {
    const details = { id: "11111111-1111-4111-8111-111111111111", version: 2, status: "evidence_submitted", note: "Installation photo", evidence_url: "https://example.org/photo.jpg" };
    expect(TransitionSchema.safeParse(details).success).toBe(true);
    expect(TransitionSchema.safeParse({ ...details, evidence_url: "http://example.org/photo.jpg" }).success).toBe(false);
    expect(TransitionSchema.safeParse({ ...details, note: " " }).success).toBe(false);
  });
});