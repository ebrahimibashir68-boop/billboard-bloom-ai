import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import billboardPreview from "@/assets/billboard-preview.jpg";
import { Sparkles, Wand2 } from "lucide-react";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "AI Creative Studio — Pi Billboard" },
      { name: "description", content: "Compose ad creatives with AI and preview them on real stadium billboard mockups." },
      { property: "og:title", content: "AI Creative Studio — Pi Billboard" },
      { property: "og:description", content: "Prompt the AI engine, choose tone and ratio, and preview stadium-ready ads in seconds." },
      { property: "og:url", content: "https://billboard-bloom-ai.lovable.app/studio" },
    ],
    links: [
      { rel: "canonical", href: "https://billboard-bloom-ai.lovable.app/studio" },
    ],
  }),
  component: Studio,
});

const presets = [
  "Energy drink ad with electric blue lighting",
  "Football kit reveal with team colors and motion",
  "Crypto exchange — clean minimal with Pi mark",
  "Sneaker launch with neon streaks at night",
];

function Studio() {
  const [prompt, setPrompt] = useState(presets[0]);
  const [tone, setTone] = useState("Cinematic");
  const [ratio, setRatio] = useState("16:9");

  return (
    <AppShell>
      <TopBar title="AI Creative Studio" status={{ label: "Engine Online" }} />

      <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-y-auto">
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="size-4 text-brand" /> Prompt
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-3 text-sm h-32 resize-none focus:outline-none focus:border-brand/50"
            />
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="px-2 py-1 text-[10px] rounded border border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                >
                  {p.split(" ").slice(0, 3).join(" ")}…
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Tone</span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2 py-2 text-xs"
                >
                  {["Cinematic", "Minimal", "Brutalist", "Editorial", "Hype"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Ratio</span>
                <select
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2 py-2 text-xs"
                >
                  {["16:9", "21:9", "1:1", "9:16"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>

            <button className="w-full py-2.5 bg-brand text-brand-foreground font-semibold text-sm rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition">
              <Wand2 className="size-4" /> Generate Creative · 12 π
            </button>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium mb-3">Suggested Targets</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex justify-between"><span>Soccer / Europe prime time</span><span className="text-brand">↑ 38%</span></li>
              <li className="flex justify-between"><span>F1 Grand Prix weekend</span><span className="text-brand">↑ 24%</span></li>
              <li className="flex justify-between"><span>NBA West Coast tip-off</span><span className="text-brand">↑ 19%</span></li>
            </ul>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium">Stadium Mockup Preview</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {tone} · {ratio}
              </span>
            </div>
            <img
              src={billboardPreview}
              alt="Generated ad creative on stadium billboard"
              width={1024}
              height={576}
              className="w-full aspect-video object-cover"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden">
                <img
                  src={billboardPreview}
                  alt={`Variant ${i}`}
                  width={1024}
                  height={576}
                  loading="lazy"
                  className="w-full aspect-video object-cover opacity-80 hover:opacity-100 transition"
                />
                <div className="px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-widest">
                  Variant {i}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
