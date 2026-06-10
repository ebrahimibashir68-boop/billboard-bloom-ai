import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import worldMap from "@/assets/world-map.jpg";
import billboardPreview from "@/assets/billboard-preview.jpg";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pi Billboard — Global Network Command" },
      {
        name: "description",
        content: "Prepare and deploy AI-generated advertisements across stadiums and live venues worldwide, powered by the Pi ecosystem.",
      },
      { property: "og:title", content: "Pi Billboard — Global Network Command" },
      {
        property: "og:description",
        content: "AI-prepared advertising across sports and live venues, paid in Pi.",
      },
      { property: "og:url", content: "https://billboard-bloom-ai.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://billboard-bloom-ai.lovable.app/" },
      { rel: "preload", as: "image", href: worldMap, fetchpriority: "high" },
    ],
  }),
  component: Dashboard,
});

const venues = [
  { code: "MNU", name: "Old Trafford, Manchester", next: "vs Liverpool", rate: "12.4k π/min", sport: "Soccer", live: true },
  { code: "LAL", name: "Crypto.com Arena, LA", next: "vs Celtics", rate: "8.1k π/min", sport: "Basketball", live: false },
  { code: "MON", name: "Circuit de Monaco", next: "Grand Prix Sunday", rate: "21.0k π/min", sport: "F1", live: true },
  { code: "TYO", name: "Tokyo Dome", next: "Giants vs Tigers", rate: "6.8k π/min", sport: "Baseball", live: false },
  { code: "BAR", name: "Camp Nou, Barcelona", next: "vs Real Madrid", rate: "18.2k π/min", sport: "Soccer", live: true },
];

const sports = ["All", "Soccer", "Basketball", "F1", "Baseball", "Esports"];

function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [activeSport, setActiveSport] = useState("All");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1400);
  };

  const filtered = activeSport === "All" ? venues : venues.filter((v) => v.sport === activeSport);

  return (
    <AppShell>
      <TopBar title="Global Node Network" status={{ label: "1,402 Active Venues" }} />

      <div className="flex-1 flex flex-col lg:flex-row relative lg:overflow-auto overflow-x-auto touch-pan-x touch-pan-y [touch-action:pinch-zoom_pan-x_pan-y]">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={worldMap}
            alt="World map of active billboard venues"
            width={1920}
            height={1088}
            fetchPriority="high"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/80" />
        </div>

        {/* Left panel: AI Creator + Venues */}
        <div className="relative z-10 w-full lg:w-[26rem] p-4 sm:p-6 flex flex-col gap-6 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto shrink-0">
          <section className="bg-surface/80 backdrop-blur-md rounded-2xl ring-1 ring-white/5 border border-border p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="size-4 text-brand" />
                AI Creative Engine
              </h2>
              <p className="text-xs text-muted-foreground max-w-[35ch] text-pretty">
                Generate stadium-ready creative from text prompts in seconds.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-background rounded-xl border border-border">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Futuristic automotive commercial with neon streaks..."
                  className="w-full bg-transparent border-none resize-none text-sm text-foreground focus:outline-none focus:ring-0 h-20 placeholder:text-muted-foreground/60"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-2.5 bg-foreground text-background font-semibold text-sm rounded-xl hover:bg-foreground/90 transition disabled:opacity-50"
              >
                {generating ? "Generating…" : "Generate Creative"}
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5">
              <img
                src={billboardPreview}
                alt="Billboard preview inside a stadium"
                width={1024}
                height={576}
                loading="lazy"
                className={`w-full aspect-video object-cover transition ${generating ? "blur-sm opacity-60" : ""}`}
              />
              <div className="absolute top-2 right-2 px-2 py-1 bg-brand text-brand-foreground text-[10px] font-bold rounded">
                LIVE PREVIEW
              </div>
            </div>
          </section>

          <section className="bg-surface/80 backdrop-blur-md rounded-2xl ring-1 ring-white/5 border border-border flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Available Slots</h3>
            </div>
            <div className="px-4 pt-3 flex flex-wrap gap-2">
              {sports.map((s) => {
                const active = s === activeSport;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSport(s)}
                    className={`px-2 py-1 text-[10px] rounded border transition ${
                      active
                        ? "bg-brand/10 border-brand/30 text-brand"
                        : "bg-surface-elevated border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="divide-y divide-border/60 mt-3">
              {filtered.map((v) => (
                <div
                  key={v.code}
                  role="button"
                  tabIndex={0}
                  aria-label={`${v.name} — ${v.next} at ${v.rate}`}
                  className="p-4 flex items-center gap-3 hover:bg-white/5 cursor-pointer"
                >
                  <div className="size-10 bg-surface-elevated rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold">
                    {v.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Next: {v.next} • {v.rate}
                    </p>
                  </div>
                  <div className={`size-2 rounded-full ${v.live ? "bg-brand animate-pulse" : "bg-muted"}`} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right floating column */}
        <div className="relative z-10 flex-1 flex flex-col p-4 sm:p-6 items-stretch lg:items-end justify-end lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="w-full lg:w-80 flex flex-col gap-4 lg:mt-auto">
            <div className="bg-surface border border-border p-4 rounded-2xl ring-1 ring-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Active Campaign
                </span>
                <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] rounded-full">Running</span>
              </div>
              <h4 className="text-sm font-semibold mb-1">Apex Velocity Run</h4>
              <p className="text-xs text-muted-foreground mb-4">7 Global Venues Live</p>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Impressions</p>
                  <p className="text-sm font-medium">1.2M</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Burn Rate</p>
                  <p className="text-sm font-medium">42 π / hr</p>
                </div>
              </div>
            </div>

            <div className="bg-brand p-4 rounded-2xl ring-1 ring-brand/30 text-brand-foreground">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-6 rounded-full bg-background flex items-center justify-center text-[10px] font-bold text-brand">
                  π
                </div>
                <span className="text-xs font-bold uppercase tracking-tight">Network Status</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-medium opacity-70">Wallet Node</p>
                  <p className="text-sm font-bold">Mainnet Connected</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium opacity-70">Gas Fee</p>
                  <p className="text-sm font-bold">0.01 π</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
