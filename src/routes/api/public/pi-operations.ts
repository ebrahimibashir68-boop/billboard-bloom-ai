import { createFileRoute } from "@tanstack/react-router";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";
import { canTransition, TransitionSchema, WorkOrderSchema, type WorkStatus } from "@/lib/ooh/operations";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function listOperations(request: Request) {
  const token = bearer(request);
  const user = token ? await verifyPiUser(token) : null;
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid reference" }, 400);
    const { data: item, error } = await supabaseAdmin.from("billboard_work_orders").select("*").eq("id", id).eq("pi_uid", user.uid).maybeSingle();
    if (error) return json({ error: "Could not load work order" }, 500);
    if (!item) return json({ error: "Not found" }, 404);
    const { data: events, error: eventError } = await supabaseAdmin.from("billboard_work_events").select("*").eq("work_order_id", id).eq("pi_uid", user.uid).order("created_at");
    if (eventError) return json({ error: "Could not load evidence history" }, 500);
    return json({ item, events: events ?? [] });
  }
  const { data, error } = await supabaseAdmin.from("billboard_work_orders").select("*").eq("pi_uid", user.uid).order("created_at", { ascending: false }).limit(200);
  return error ? json({ error: "Could not load operations" }, 500) : json({ items: data ?? [] });
}

export async function saveOperation(request: Request) {
  const token = bearer(request);
  const user = token ? await verifyPiUser(token) : null;
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (body?.action === "create") {
    const parsed = WorkOrderSchema.safeParse(body.payload);
    if (!parsed.success) return json({ error: "Check the work order fields and dates" }, 400);
    const { data, error } = await supabaseAdmin.rpc("create_billboard_work_order", { p_uid: user.uid, p_username: user.username, p_details: parsed.data });
    if (error) { console.error("[pi-operations] create failed", error.code); return json({ error: "Could not save work order and ledger record" }, 500); }
    return json({ ok: true, id: data }, 201);
  }
  if (body?.action === "transition") {
    const parsed = TransitionSchema.safeParse(body.payload);
    if (!parsed.success) return json({ error: "A note and valid evidence URL are required" }, 400);
    const input = parsed.data;
    const { data: item, error: readError } = await supabaseAdmin.from("billboard_work_orders").select("status, version").eq("id", input.id).eq("pi_uid", user.uid).maybeSingle();
    if (readError) return json({ error: "Could not load work order" }, 500);
    if (!item) return json({ error: "Not found" }, 404);
    if (item.version !== input.version) return json({ error: "Record changed; refresh before updating" }, 409);
    if (!canTransition(item.status as WorkStatus, input.status)) return json({ error: "Invalid status transition" }, 409);
    const { data, error } = await supabaseAdmin.rpc("advance_billboard_work_order", {
      p_uid: user.uid, p_id: input.id, p_version: input.version, p_status: input.status,
      p_note: input.note, p_evidence_url: input.evidence_url ?? "",
    });
    if (error) { console.error("[pi-operations] transition failed", error.code); return json({ error: "Update not recorded; refresh and try again" }, 409); }
    return json({ ok: true, version: data });
  }
  return json({ error: "Invalid action" }, 400);
}

export const Route = createFileRoute("/api/public/pi-operations")({
  server: { handlers: { GET: ({ request }) => listOperations(request), POST: ({ request }) => saveOperation(request) } },
});