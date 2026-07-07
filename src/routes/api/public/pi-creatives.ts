import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";

const CreateSchema = z.object({
  kind: z.enum(["text", "image", "video"]),
  name: z.string().trim().min(1).max(120),
  spec: z.record(z.string(), z.unknown()),
  preview_url: z.string().url().max(1000).optional(),
  thumbnail_url: z.string().url().max(1000).optional(),
});

export const Route = createFileRoute("/api/public/pi-creatives")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const { data, error } = await supabaseAdmin
          .from("creatives")
          .select("id, kind, name, spec, preview_url, thumbnail_url, created_at")
          .eq("pi_uid", user.uid)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return Response.json({ error: "Internal error" }, { status: 500 });
        return Response.json({ creatives: data ?? [] });
      },
      POST: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const raw = await request.json().catch(() => null);
        const parsed = CreateSchema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const { data, error } = await supabaseAdmin
          .from("creatives")
          .insert({
            pi_uid: user.uid,
            pi_username: user.username,
            kind: parsed.data.kind,
            name: parsed.data.name,
            spec: parsed.data.spec as never,
            preview_url: parsed.data.preview_url ?? null,
            thumbnail_url: parsed.data.thumbnail_url ?? null,
          })
          .select("id")
          .single();
        if (error || !data) {
          console.error("[pi-creatives] insert failed", error);
          return Response.json({ error: "Insert failed" }, { status: 500 });
        }
        return Response.json({ ok: true, id: data.id });
      },
    },
  },
});
