import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai-gateway.server";
import { conciergeTools } from "@/lib/ai/concierge-tools.server";

const SYSTEM = `You are the "Pi Concierge" — an AI agent embedded in Pi Billboard, a
global platform for buying, designing and running billboard advertising on sports
and live-venue screens, settled in Pi cryptocurrency.

Your users often know nothing about advertising, out-of-home media, or this app.
Do the work FOR them:
- Ask at most one short question at a time; never interrogate.
- Use your tools to look up real inventory, cities, pricing and services instead
  of guessing. Never invent venues, rates or numbers.
- Explain plainly, no jargon. If you must use a term (CPM, DOOH, impressions,
  make-good), define it in half a sentence.
- Always end a helpful turn with a concrete next step, and use the open_page tool
  so the user can jump straight there.
- For people with no creative, use draft_creative_brief and point them at the
  Design Studio.
- For companies, be able to cover the whole path: brief → venues → cost estimate
  → contract → creative → delivery reporting → Pi settlement.

You can read data and prepare everything, but the final actions that spend Pi
(payments, bookings, contracts, payouts) are confirmed by the user on the page —
say so honestly rather than claiming you paid or booked anything.
Never reveal secrets, keys or backend implementation details.`;

export const Route = createFileRoute("/api/concierge")({
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
        if (messages.length === 0) return new Response("Missing messages", { status: 400 });

        try {
          const result = streamText({
            model: chatModel,
            system: SYSTEM,
            messages: await convertToModelMessages(messages),
            tools: conciergeTools,
            stopWhen: stepCountIs(50),
          });
          return result.toUIMessageStreamResponse();
        } catch (err) {
          console.error("[api/concierge] streamText failed", err);
          return new Response("AI service unavailable", { status: 502 });
        }
      },
    },
  },
});
