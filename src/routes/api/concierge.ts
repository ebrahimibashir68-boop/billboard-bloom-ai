import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type ToolSet, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai-gateway.server";
import { BOTS, resolveBot } from "@/lib/ai/bots.server";

export const Route = createFileRoute("/api/concierge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages?: UIMessage[]; bot?: unknown };
        try {
          body = (await request.json()) as { messages?: UIMessage[]; bot?: unknown };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) return new Response("Missing messages", { status: 400 });

        const bot = BOTS[resolveBot(body.bot)];

        try {
          const result = streamText({
            model: chatModel,
            system: bot.system,
            messages: await convertToModelMessages(messages),
            tools: bot.tools as ToolSet,
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
