import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearer, isAdminPiUid, verifyPiUser } from "@/lib/pi/auth-helper.server";

const RegisterSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(200),
  country: z.string().trim().min(2).max(80),
  website: z.string().trim().url().max(300).optional().or(z.literal("").transform(() => undefined)),
  billboards_summary: z.string().trim().max(1000).optional(),
});

const DecideRequestSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  notes: z.string().trim().max(1000).optional(),
});

const AdminDecideSchema = z.object({
  partner_id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "suspended"]),
});

export const Route = createFileRoute("/api/public/pi-partners")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") ?? "mine";

        if (mode === "admin" && isAdminPiUid(user.uid)) {
          const { data: partners } = await supabaseAdmin
            .from("ad_partners")
            .select("*")
            .order("created_at", { ascending: false });
          return Response.json({ partners: partners ?? [], is_admin: true });
        }

        // Owner's partner record + their pending approval queue.
        const { data: partner } = await supabaseAdmin
          .from("ad_partners")
          .select("*")
          .eq("owner_pi_uid", user.uid)
          .maybeSingle();

        let requests: unknown[] = [];
        let venues: unknown[] = [];
        if (partner) {
          const { data: reqs } = await supabaseAdmin
            .from("ad_approval_requests")
            .select(
              "id, contract_id, status, reviewer_notes, reviewed_at, created_at, ad_contracts(id, title, body_text, image_url, tier, advertiser_pi_username, cost_pi, contract_hash), ad_placements(id, venue_code, venue_name, sport, status)",
            )
            .eq("partner_id", partner.id)
            .order("created_at", { ascending: false })
            .limit(100);
          requests = reqs ?? [];

          const { data: vs } = await supabaseAdmin
            .from("venues")
            .select("code, name, sport, placement, city, country, active")
            .eq("partner_id", partner.id)
            .order("name");
          venues = vs ?? [];
        }
        return Response.json({
          partner,
          requests,
          venues,
          is_admin: isAdminPiUid(user.uid),
        });
      },
      POST: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(request.url);
        const action = url.searchParams.get("action") ?? "register";
        const raw = await request.json().catch(() => null);

        if (action === "register") {
          const parsed = RegisterSchema.safeParse(raw);
          if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
          // One partner per Pi UID.
          const { data: existing } = await supabaseAdmin
            .from("ad_partners")
            .select("id, status")
            .eq("owner_pi_uid", user.uid)
            .maybeSingle();
          if (existing) {
            return Response.json({ ok: true, id: existing.id, status: existing.status });
          }
          const { data, error } = await supabaseAdmin
            .from("ad_partners")
            .insert({
              owner_pi_uid: user.uid,
              owner_pi_username: user.username,
              company_name: parsed.data.company_name,
              contact_email: parsed.data.contact_email,
              country: parsed.data.country,
              website: parsed.data.website ?? null,
              billboards_summary: parsed.data.billboards_summary ?? null,
              status: "pending",
            })
            .select("id")
            .single();
          if (error || !data) {
            console.error("[pi-partners] insert", error);
            return Response.json({ error: "Registration failed" }, { status: 500 });
          }
          return Response.json({ ok: true, id: data.id, status: "pending" });
        }

        if (action === "decide-request") {
          const parsed = DecideRequestSchema.safeParse(raw);
          if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
          // Verify owner or admin.
          const { data: req } = await supabaseAdmin
            .from("ad_approval_requests")
            .select("id, partner_id, contract_id, ad_partners(owner_pi_uid)")
            .eq("id", parsed.data.request_id)
            .maybeSingle();
          if (!req) return Response.json({ error: "Not found" }, { status: 404 });
          const partnerOwner =
            (req as unknown as { ad_partners: { owner_pi_uid: string | null } | null }).ad_partners
              ?.owner_pi_uid ?? null;
          if (!isAdminPiUid(user.uid) && partnerOwner !== user.uid) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }
          const newPlacementStatus =
            parsed.data.decision === "approved"
              ? "scheduled"
              : parsed.data.decision === "rejected"
                ? "rejected"
                : "pending_approval";
          await supabaseAdmin
            .from("ad_approval_requests")
            .update({
              status: parsed.data.decision,
              reviewer_notes: parsed.data.notes ?? null,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", parsed.data.request_id);
          await supabaseAdmin
            .from("ad_placements")
            .update({ status: newPlacementStatus })
            .eq("approval_request_id", parsed.data.request_id);
          return Response.json({ ok: true });
        }

        if (action === "admin-decide-partner") {
          if (!isAdminPiUid(user.uid))
            return Response.json({ error: "Forbidden" }, { status: 403 });
          const parsed = AdminDecideSchema.safeParse(raw);
          if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
          await supabaseAdmin
            .from("ad_partners")
            .update({ status: parsed.data.status })
            .eq("id", parsed.data.partner_id);
          return Response.json({ ok: true });
        }

        return Response.json({ error: "Unknown action" }, { status: 400 });
      },
    },
  },
});
