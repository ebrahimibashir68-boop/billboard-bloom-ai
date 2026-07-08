import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";

const CreateSchema = z.object({
  campaign_name: z.string().trim().min(2).max(120),
  brief: z.string().trim().min(10).max(2000),
  objective: z.enum(["awareness", "traffic", "sales", "launch", "other"]).optional(),
  target_audience: z.string().trim().max(500).optional(),
  target_countries: z.array(z.string().trim().max(56)).max(50).optional(),
  target_cities: z.array(z.string().trim().max(80)).max(50).optional(),
  budget_pi: z.number().positive().max(1_000_000),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferred_formats: z.array(z.enum(["image", "video", "text"])).max(3).optional(),
  creative_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/public/pi-rfps")({
  server: {
    handlers: {
      // Public marketplace: anyone can browse open RFPs.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mine = url.searchParams.get("mine") === "1";
        if (mine) {
          const token = bearer(request);
          if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
          const user = await verifyPiUser(token);
          if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
          const { data, error } = await supabaseAdmin
            .from("ad_rfps")
            .select("*")
            .eq("advertiser_pi_uid", user.uid)
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) return Response.json({ error: "Internal error" }, { status: 500 });
          return Response.json({ rfps: data ?? [] });
        }
        const { data, error } = await supabaseAdmin
          .from("ad_rfps")
          .select("id, campaign_name, brief, objective, target_countries, target_cities, budget_pi, start_date, end_date, preferred_formats, status, advertiser_pi_username, created_at")
          .in("status", ["open", "awarded"])
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return Response.json({ error: "Internal error" }, { status: 500 });
        return Response.json({ rfps: data ?? [] });
      },
      POST: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const raw = await request.json().catch(() => null);
        const parsed = CreateSchema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        if (parsed.data.end_date <= parsed.data.start_date) {
          return Response.json({ error: "end_date must be after start_date" }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
          .from("ad_rfps")
          .insert({
            advertiser_pi_uid: user.uid,
            advertiser_pi_username: user.username,
            campaign_name: parsed.data.campaign_name,
            brief: parsed.data.brief,
            objective: parsed.data.objective ?? null,
            target_audience: parsed.data.target_audience ?? null,
            target_countries: parsed.data.target_countries ?? null,
            target_cities: parsed.data.target_cities ?? null,
            budget_pi: parsed.data.budget_pi,
            start_date: parsed.data.start_date,
            end_date: parsed.data.end_date,
            preferred_formats: parsed.data.preferred_formats ?? ["image", "video"],
            creative_id: parsed.data.creative_id ?? null,
          })
          .select("id")
          .single();
        if (error || !data) {
          console.error("[pi-rfps] insert failed", error);
          return Response.json({ error: "Insert failed" }, { status: 500 });
        }
        return Response.json({ ok: true, id: data.id });
      },
    },
  },
});
