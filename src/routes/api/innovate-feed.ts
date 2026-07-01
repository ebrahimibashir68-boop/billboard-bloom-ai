import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";
import { chatModel } from "@/lib/ai-gateway.server";

const FeedSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(4).max(90),
        category: z.enum([
          "AI Creative",
          "DOOH",
          "Pi Ecosystem",
          "Analytics",
          "Venue Ops",
          "Payments",
        ]),
        impact: z.enum(["low", "medium", "high"]),
        summary: z.string().min(40).max(280),
        action: z.string().min(10).max(140),
      }),
    )
    .length(6),
});

export const Route = createFileRoute("/api/innovate-feed")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { object } = await generateObject({
            model: chatModel,
            schema: FeedSchema,
            prompt: `Generate 6 fresh, distinct innovation updates tailored to
"Pi Billboard", a global AI ad platform for sports and live-venue billboards
that settles payments in Pi cryptocurrency.

Mix categories. Each item must be a concrete, buildable update the team could
ship in the next 1–4 sprints (e.g. new creative generator, venue-targeting
signal, Pi payment UX improvement, analytics dashboard, DOOH programmatic
integration, computer-vision measurement). Avoid vague trends. Vary impact
levels. Do NOT repeat previous outputs — make them feel current and novel.`,
          });
          return Response.json(
            { ok: true, items: object.items, generatedAt: Date.now() },
            {
              headers: {
                "Cache-Control": "public, max-age=0, s-maxage=300",
              },
            },
          );
        } catch (err) {
          console.error("[api/innovate-feed] failed", err);
          return new Response("AI service unavailable", { status: 502 });
        }
      },
    },
  },
});
