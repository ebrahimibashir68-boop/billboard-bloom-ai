import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { TrendingUp, Eye, Globe2, Coins } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Pi Billboard" },
      { name: "description", content: "Network-wide performance, spend, and reach for Pi Billboard campaigns." },
      { property: "og:title", content: "Analytics — Pi Billboard" },
      { property: "og:description", content: "Live telemetry: impressions, spend, and reach across every venue on the Pi Billboard network." },
      { property: "og:url", content: "https://billboard-bloom-ai.lovable.app/analytics" },
    ],
    links: [
      { rel: "canonical", href: "https://billboard-bloom-ai.lovable.app/analytics" },
    ],
  }),
  component: Analytics,
});

const stats = [
  { label: "Impressions (24h)", value: "8.42M", delta: "+12.4%", icon: Eye },
  { label: "Active Venues", value: "1,402", delta: "+38", icon: Globe2 },
  { label: "Spend (24h)", value: "12,040 π", delta: "+6.1%", icon: Coins },
  { label: "Engagement Index", value: "74.2", delta: "+2.8", icon: TrendingUp },
];

const bars = [42, 55, 38, 71, 64, 82, 90, 76, 88, 95, 78, 84];

function Analytics() {
  return (
    <AppShell>
      <TopBar title="Network Analytics" status={{ label: "Live Telemetry" }} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</span>
                <s.icon className="size-4 text-brand" />
              </div>
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-xs text-success mt-1">{s.delta}</div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium">Impressions, last 12 hours</h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">UTC</span>
          </div>
          <div className="flex items-end gap-3 h-48">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-brand/30 to-brand rounded-t"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{i + 1}h</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium mb-4">Top Venues by Reach</h3>
            <ul className="space-y-3 text-sm">
              {[
                ["Camp Nou, Barcelona", "1.8M"],
                ["Old Trafford, Manchester", "1.4M"],
                ["Crypto.com Arena, LA", "980K"],
                ["Tokyo Dome", "742K"],
                ["Circuit de Monaco", "612K"],
              ].map(([name, val]) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-semibold">{val}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium mb-4">Sport Distribution</h3>
            <ul className="space-y-3 text-xs">
              {[
                ["Soccer", 48],
                ["Basketball", 22],
                ["F1", 14],
                ["Baseball", 10],
                ["Esports", 6],
              ].map(([label, pct]) => (
                <li key={label as string}>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
