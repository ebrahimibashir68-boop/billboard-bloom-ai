import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const apiKey = process.env.LOVABLE_API_KEY;
if (!apiKey) {
  console.warn("[ai-gateway] LOVABLE_API_KEY is not set");
}

const gateway = createOpenAICompatible({
  name: "lovable",
  apiKey: apiKey ?? "",
  baseURL: "https://ai.gateway.lovable.dev/v1",
});

export const chatModel = gateway.chatModel("google/gemini-2.5-flash");
