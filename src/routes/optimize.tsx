import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";

export const Route = createFileRoute("/optimize")({
  head: () => ({
    meta: [
      { title: "AI Creative Optimizer · Pi Billboard" },
      { name: "description", content: "Get AI-powered scoring, headline variants, and audience targeting for your billboard creatives." },
    ],
  }),
  component: OptimizePage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface Creative { id: string; name: string; kind: string; }
interface Optimization {
  score: number;
  headline_variants: string[];
  suggestions: { area: string; advice: string }[];
  audience: { demographics: string; best_placements: string[]; best_cities: string[] };
}

function OptimizePage() {
  const { user, authenticate } = usePi();
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [opt, setOpt] = useState<Optimization | null>(null);
  const [loading, setLoading] = useState(false);

  const getToken = useCallback(async () => {
    try {
      const r = await authenticate(["username"]);
      return (r as { accessToken?: string }).accessToken ?? null;
    } catch { return null; }
  }, [authenticate]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/public/pi-creatives", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const j = (await res.json()) as { creatives: Creative[] };
        setCreatives(j.creatives);
        if (j.creatives[0]) setSelected(j.creatives[0].id);
      }
    })();
  }, [user, getToken]);

  async function run() {
    if (!selected) return;
    setLoading(true);
    setOpt(null);
    try {
      const token = await getToken();
      if (!token) { toast.error("Sign in with Pi"); return; }
      const res = await fetch("/api/public/pi-optimize-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creative_id: selected }),
      });
      if (!res.ok) { toast.error("AI optimizer unavailable"); return; }
      const j = (await res.json()) as Optimization;
      setOpt(j);
    } finally { setLoading(false); }
  }

  return (
    <AppShell>
      <TopBar />
      <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6">
        <header>
          <div className="inline-flex items-center gap-2 text-xs text-brand font-mono uppercase tracking-widest mb-2">
            <Sparkles className="size-3.5" /> AI creative optimizer
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">Sharpen your billboard</h1>
          <p className="text-muted-foreground mt-2">Pick a saved creative. The AI scores it, rewrites the headline, and recommends target audiences, placements, and cities.</p>
        </header>

        {!user && <div className="p-4 rounded-lg border border-brand/40 bg-brand/5 text-sm">Sign in with Pi to use the optimizer.</div>}

        {user && (
          <div className="p-5 rounded-xl border border-border bg-surface space-y-3">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
              <option value="">— Select a creative —</option>
              {creatives.map((c) => (<option key={c.id} value={c.id}>{c.name} · {c.kind}</option>))}
            </select>
            <button onClick={run} disabled={!selected || loading} className="w-full px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              <Wand2 className="size-4" /> {loading ? "Optimizing…" : "Run AI optimizer"}
            </button>
          </div>
        )}

        {opt && (
          <div className="space-y-4">
            <div className="p-6 rounded-xl border border-brand/40 bg-brand/5">
              <div className="text-xs text-muted-foreground uppercase font-mono">Overall score</div>
              <div className="text-5xl font-semibold font-mono text-brand mt-1">{opt.score}<span className="text-xl text-muted-foreground">/100</span></div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-surface">
              <h3 className="font-medium mb-3">Headline variants</h3>
              <ul className="space-y-2">
                {opt.headline_variants.map((h, i) => (<li key={i} className="p-3 rounded-lg bg-background border border-border text-sm">{h}</li>))}
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-border bg-surface">
              <h3 className="font-medium mb-3">Targeting</h3>
              <div className="text-sm space-y-2">
                <div><span className="text-muted-foreground">Audience:</span> {opt.audience.demographics}</div>
                <div><span className="text-muted-foreground">Placements:</span> {opt.audience.best_placements.join(", ")}</div>
                <div><span className="text-muted-foreground">Cities:</span> {opt.audience.best_cities.join(", ")}</div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-surface">
              <h3 className="font-medium mb-3">Suggestions</h3>
              <ul className="space-y-2">
                {opt.suggestions.map((s, i) => (
                  <li key={i} className="p-3 rounded-lg bg-background border border-border text-sm">
                    <div className="text-xs uppercase text-brand font-mono">{s.area}</div>
                    <div className="mt-1">{s.advice}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
