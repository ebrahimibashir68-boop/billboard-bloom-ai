import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Bot, RefreshCw, Sparkles, TrendingUp, Zap } from "lucide-react";

export const Route = createFileRoute("/innovate")({
  head: () => ({
    meta: [
      { title: "Innovation Bot — Pi Billboard" },
      {
        name: "description",
        content:
          "An AI bot that tracks the latest ad-tech, DOOH, and Pi ecosystem advances and proposes tailored product updates for Pi Billboard.",
      },
      { property: "og:title", content: "Innovation Bot — Pi Billboard" },
      {
        property: "og:description",
        content:
          "Live feed of AI-generated innovation updates plus an on-demand chat assistant for Pi Billboard operators.",
      },
      {
        property: "og:url",
        content: "https://billboard-bloom-ai.lovable.app/innovate",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://billboard-bloom-ai.lovable.app/innovate",
      },
    ],
  }),
  component: InnovatePage,
});

type FeedItem = {
  title: string;
  category: string;
  impact: "low" | "medium" | "high";
  summary: string;
  action: string;
};

const impactStyles: Record<FeedItem["impact"], string> = {
  low: "bg-surface text-muted-foreground border-border",
  medium: "bg-surface-elevated text-foreground border-border",
  high: "bg-brand/15 text-brand border-brand/30",
};

const suggestions = [
  "What DOOH trend should we ship next sprint?",
  "Propose a new Pi payments UX improvement",
  "Ideas for computer-vision billboard attention metrics",
  "How can we auto-optimize venue pricing multipliers?",
];

function InnovatePage() {
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const res = await fetch("/api/innovate-feed", { cache: "no-store" });
      if (!res.ok) throw new Error(`Feed ${res.status}`);
      const data = (await res.json()) as { items: FeedItem[] };
      setFeed(data.items);
    } catch (err) {
      console.error(err);
      setFeedError("Could not reach the innovation feed. Try again.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
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

  const sendSuggestion = useCallback(
    (text: string) => {
      void sendMessage({ text });
    },
    [sendMessage],
  );

  return (
    <AppShell>
      <TopBar
        title="Innovation Bot"
        status={{ label: isStreaming ? "Thinking" : "Bot Online" }}
      />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 overflow-y-auto">
        {/* Feed */}
        <section className="xl:col-span-7 min-w-0 flex flex-col gap-4">
          <header className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
                <TrendingUp className="size-3.5" />
                Live Innovation Feed
              </div>
              <h2 className="text-lg font-semibold mt-1">
                Advancements tailored to Pi Billboard
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void loadFeed()}
              disabled={feedLoading}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-surface hover:bg-surface-elevated text-xs font-medium disabled:opacity-60"
              aria-label="Refresh innovation feed"
            >
              <RefreshCw
                className={`size-3.5 ${feedLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </header>

          {feedError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
              {feedError}
            </div>
          )}

          <div className="grid gap-3">
            {feedLoading && !feed
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-surface p-4"
                  >
                    <Shimmer className="h-4 w-40 mb-3" />
                    <Shimmer className="h-3 w-full mb-2" />
                    <Shimmer className="h-3 w-4/5" />
                  </div>
                ))
              : feed?.map((item, i) => (
                  <article
                    key={`${item.title}-${i}`}
                    className="rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {item.category}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${impactStyles[item.impact]}`}
                        >
                          {item.impact} impact
                        </span>
                      </div>
                      <Sparkles className="size-3.5 text-brand" />
                    </div>
                    <h3 className="font-semibold leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      {item.summary}
                    </p>
                    <div className="mt-3 flex items-start gap-2 text-xs">
                      <Zap className="size-3.5 text-brand mt-0.5 shrink-0" />
                      <span className="text-foreground/90">{item.action}</span>
                    </div>
                  </article>
                ))}
          </div>
        </section>

        {/* Chat */}
        <section className="xl:col-span-5 min-w-0 flex flex-col rounded-lg border border-border bg-surface overflow-hidden min-h-[560px] xl:h-[calc(100vh-8rem)] xl:sticky xl:top-6">
          <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="size-8 rounded-md bg-brand/15 text-brand flex items-center justify-center">
              <Bot className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Innovation Assistant</div>
              <div className="text-[11px] text-muted-foreground">
                On-demand. Nothing is saved between sessions.
              </div>
            </div>
          </header>

          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Bot className="size-6" />}
                  title="Ask for the next big update"
                  description="Ideas for creative, DOOH, Pi payments, analytics — get concrete, buildable proposals."
                >
                  <div className="mt-4 grid gap-2 w-full max-w-sm">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendSuggestion(s)}
                        className="text-left text-xs px-3 py-2 rounded-md border border-border bg-background hover:bg-surface-elevated"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </ConversationEmptyState>
              ) : (
                (messages as UIMessage[]).map((m) => {
                  const text = m.parts
                    .filter((p) => p.type === "text")
                    .map((p) => ("text" in p ? p.text : ""))
                    .join("");
                  return (
                    <Message key={m.id} from={m.role}>
                      <MessageContent>
                        {m.role === "assistant" ? (
                          <MessageResponse>{text}</MessageResponse>
                        ) : (
                          <span className="whitespace-pre-wrap">{text}</span>
                        )}
                      </MessageContent>
                    </Message>
                  );
                })
              )}
              {status === "submitted" && (
                <div className="px-4">
                  <Shimmer className="h-3 w-40" />
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {error && (
            <div className="px-4 py-2 text-xs text-destructive border-t border-destructive/30 bg-destructive/10">
              Chat failed. Try again in a moment.
            </div>
          )}

          <div className="border-t border-border p-3">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onChange={(e) => setInput(e.currentTarget.value)}
                  placeholder="Ask for a tailored Pi Billboard update…"
                />
                <PromptInputFooter>
                  <div className="text-[11px] text-muted-foreground">
                    Powered by AI Gateway · No history saved
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
        </section>
      </div>
    </AppShell>
  );
}
