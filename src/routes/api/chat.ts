import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai-gateway.server";

const SYSTEM = `You are the Innovation Bot for "Pi Billboard" — a global AI ad
platform that lets brands buy ad placements on sports and live-venue billboards
and pay with Pi cryptocurrency inside the Pi ecosystem.

Your job is to help operators, marketers, and product owners:
- Track continuous advancements in ad-tech, computer vision, generative AI,
  DOOH (digital out-of-home), programmatic ads, and Web3/Pi Network.
- Propose new, innovative product updates tailored to the Pi Billboard app
  (venue targeting, creative generation, pricing multipliers, Pi payments UX,
  analytics, etc.).
- Give concrete, buildable ideas: title, one-line pitch, why it matters now,
  and a rough implementation sketch. Keep answers focused and actionable.

Never fabricate live data. If asked about specific real-time metrics, say so
and suggest an experiment or data source. Never expose secrets or backend
implementation details.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages?: UIMessage[] };
        try {
          body = (await request.json()) as { messages?: UIMessage[] };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response("Missing messages", { status: 400 });
        }

        try {
          const result = streamText({
            model: chatModel,
            system: SYSTEM,
            messages: convertToModelMessages(messages),
          });
          return result.toUIMessageStreamResponse();
        } catch (err) {
          console.error("[api/chat] streamText failed", err);
          return new Response("AI service unavailable", { status: 502 });
        }
      },
    },
  },
});
