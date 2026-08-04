import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Bot, Sparkles, X, Wrench } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const starters = [
  "I've never advertised before — do everything for me",
  "Find me billboards in Dubai and estimate a 7-day cost",
  "What does this app actually do?",
  "I'm a venue owner — how do I earn Pi?",
];

type OpenPagePart = { route: string; label: string; reason: string };

const toolLabels: Record<string, string> = {
  "tool-list_services": "Reading the app's services",
  "tool-search_billboards": "Searching live billboard inventory",
  "tool-city_inventory": "Checking city inventory",
  "tool-estimate_cost": "Estimating cost in Pi",
  "tool-venue_taxonomy": "Classifying venue types",
  "tool-draft_creative_brief": "Drafting a creative brief",
  "tool-open_page": "Preparing your next step",
};

/** App-wide AI agent that can explain and carry out the app's tasks for the user. */
export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/concierge" }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(
    (message: { text?: string }) => {
      const text = (message.text ?? input).trim();
      if (!text) return;
      void sendMessage({ text });
      setInput("");
    },
    [input, sendMessage],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the Pi Concierge AI assistant"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 h-12 pl-3 pr-4 rounded-full bg-brand text-brand-foreground shadow-[0_0_28px_-6px_var(--color-brand)] hover:brightness-110 transition"
      >
        <Bot className="size-5" />
        <span className="text-sm font-semibold hidden sm:inline">Ask AI</span>
      </button>
    );
  }

  return (
    <aside
      className="fixed inset-x-2 bottom-2 z-40 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] h-[min(78vh,640px)] flex flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
      aria-label="Pi Concierge assistant"
    >
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <div className="size-8 rounded-md bg-brand/15 text-brand flex items-center justify-center">
          <Bot className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Pi Concierge</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {isStreaming ? "Working on it…" : "Does the work for you, in Pi"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-elevated flex items-center justify-center"
        >
          <X className="size-4" />
        </button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Sparkles className="size-6" />}
              title="Tell me what you need"
              description="I can explain the app, find venues, price a campaign, brief the creative and walk you to the right screen."
            >
              <div className="mt-4 grid gap-2 w-full">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void sendMessage({ text: s })}
                    className="text-left text-xs px-3 py-2 rounded-md border border-border bg-background hover:bg-surface-elevated"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            (messages as UIMessage[]).map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <span key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      );
                    }
                    if (part.type === "tool-open_page") {
                      const out = (part as { output?: OpenPagePart }).output;
                      if (!out?.route) return null;
                      return (
                        <div key={i} className="rounded-md border border-brand/30 bg-brand/10 p-3">
                          <p className="text-xs text-foreground/90 mb-2">{out.reason}</p>
                          <Link
                            to={out.route}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center h-8 px-3 rounded-md bg-brand text-brand-foreground text-xs font-semibold"
                          >
                            {out.label}
                          </Link>
                        </div>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const done = (part as { state?: string }).state === "output-available";
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[11px] text-muted-foreground"
                        >
                          <Wrench className={`size-3 ${done ? "" : "animate-pulse"}`} />
                          {toolLabels[part.type] ?? part.type.replace("tool-", "")}
                          {done ? " ✓" : "…"}
                        </div>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer>Thinking…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="px-3 py-2 text-xs text-destructive border-t border-destructive/30 bg-destructive/10">
          The assistant couldn&apos;t respond. Try again in a moment.
        </div>
      )}

      <div className="border-t border-border p-2.5">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask anything, or say “do it for me”…"
            />
            <PromptInputFooter>
              <div className="text-[11px] text-muted-foreground">
                Pi-settled actions still need your confirmation
              </div>
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && !isStreaming}
                onClick={
                  isStreaming
                    ? (e) => {
                        e.preventDefault();
                        stop();
                      }
                    : undefined
                }
              />
            </PromptInputFooter>
          </PromptInputBody>
        </PromptInput>
      </div>
    </aside>
  );
}
