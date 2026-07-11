import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateObject } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chatModel } from "@/lib/ai-gateway.server";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const Schema = z.object({
  score: z.number().min(0).max(100),
  headline_variants: z.array(z.string()).max(5),
  suggestions: z.array(
    z.object({ area: z.string(), advice: z.string() }),
  ).max(6),
  audience: z.object({
    demographics: z.string(),
    best_placements: z.array(z.string()).max(5),
    best_cities: z.array(z.string()).max(6),
  }),
});

export const Route = createFileRoute("/api/public/pi-optimize-creative")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json().catch(() => null) as { creative_id?: string } | null;
        if (!body?.creative_id) return Response.json({ error: "Invalid" }, { status: 400 });

        const { data: creative } = await db
          .from("creatives")
          .select("id, kind, name, spec")
          .eq("id", body.creative_id)
          .eq("pi_uid", user.uid)
          .maybeSingle();
        if (!creative) return Response.json({ error: "Not found" }, { status: 404 });

        try {
          const { object } = await generateObject({
            model: chatModel,
            schema: Schema,
            prompt: `You are the Pi Billboard AI creative optimizer. Rate this ${creative.kind} billboard creative and suggest concrete improvements for global DOOH display on Pi Network.

Creative name: ${creative.name}
Spec: ${JSON.stringify(creative.spec).slice(0, 2000)}

Return a score (0-100), 3 alternative headline variants, up to 6 targeted suggestions across the areas: message, contrast, motion, timing, targeting, brand-fit. Suggest a target demographic, best placement types (stadium/transit/retail/premium/street), and up to 6 high-impact cities worldwide.`,
          });

          await db.from("creative_optimizations").insert({
            creative_id: creative.id,
            pi_uid: user.uid,
            score: Math.round(object.score),
            suggestions: object.suggestions,
            audience: object.audience,
            headline_variants: object.headline_variants,
          });
          return Response.json({ ok: true, ...object });
        } catch (err) {
          console.error("[optimize] AI failed", err);
          return Response.json({ error: "AI unavailable" }, { status: 502 });
        }
      },
      GET: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const url = new URL(request.url);
        const creativeId = url.searchParams.get("creative_id");
        if (!creativeId) return Response.json({ error: "Invalid" }, { status: 400 });
        const { data } = await db
          .from("creative_optimizations")
          .select("id, score, suggestions, audience, headline_variants, created_at")
          .eq("creative_id", creativeId)
          .eq("pi_uid", user.uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return Response.json({ optimization: data ?? null });
      },
    },
  },
});
