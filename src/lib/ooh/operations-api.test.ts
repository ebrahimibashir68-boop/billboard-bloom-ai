import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/pi/auth-helper.server", () => ({ bearer: (request: Request) => request.headers.get("Authorization")?.replace("Bearer ", "") ?? "", verifyPiUser: mocks.verify }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
import { listOperations, saveOperation } from "@/routes/api/public/pi-operations";

const id = "11111111-1111-4111-8111-111111111111";
const request = (payload: object) => new Request("https://example.org/api/public/pi-operations", { method: "POST", headers: { Authorization: "Bearer test-fixture", "Content-Type": "application/json" }, body: JSON.stringify(payload) });
function row(value: object | null) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: value, error: null }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); mocks.from.mockReturnValue(query); return query;
}
describe("Pi-owned operations authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue({ uid: "owner-fixture", username: "owner" }); });
  it("rejects anonymous requests before reading data", async () => {
    expect((await listOperations(new Request("https://example.org/api/public/pi-operations"))).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("scopes a dossier to the verified Pi owner", async () => {
    const query = row(null);
    const response = await listOperations(new Request(`https://example.org/api/public/pi-operations?id=${id}`, { headers: { Authorization: "Bearer test-fixture" } }));
    expect(response.status).toBe(404);
    expect(query.eq).toHaveBeenCalledWith("pi_uid", "owner-fixture");
  });
  it("takes ownership from Pi verification, not user input", async () => {
    mocks.rpc.mockResolvedValue({ data: id, error: null });
    const response = await saveOperation(request({ action: "create", payload: { category: "engineering", title: "Survey", site_name: "Stadium", market: "London", due_on: "2026-10-30", pi_uid: "attacker" } }));
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith("create_billboard_work_order", expect.objectContaining({ p_uid: "owner-fixture" }));
    expect(mocks.rpc.mock.calls[0]?.[1].p_details).not.toHaveProperty("pi_uid");
  });
  it("rejects stale versions without writing", async () => {
    row({ status: "draft", version: 2 });
    const response = await saveOperation(request({ action: "transition", payload: { id, version: 1, status: "submitted", note: "Ready" } }));
    expect(response.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("prevents completion without the evidence-review state", async () => {
    row({ status: "in_progress", version: 2 });
    const response = await saveOperation(request({ action: "transition", payload: { id, version: 2, status: "completed", note: "Accepted" } }));
    expect(response.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});