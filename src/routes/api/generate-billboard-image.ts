import { createFileRoute } from "@tanstack/react-router";

// Non-streaming image generation via Lovable AI Gateway (chat-shape Gemini image model).
// Returns a data URL for immediate preview.
export const Route = createFileRoute("/api/generate-billboard-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const { prompt } = (await request.json().catch(() => ({}))) as { prompt?: string };
        if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("[generate-billboard-image] gateway error", res.status, text);
          return Response.json({ error: `Gateway ${res.status}` }, { status: 502 });
        }
        const body = (await res.json()) as {
          choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
        };
        const url = body.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!url) return Response.json({ error: "No image in response" }, { status: 502 });
        return Response.json({ url });
      },
    },
  },
});
