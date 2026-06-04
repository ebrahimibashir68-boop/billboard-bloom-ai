import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — Pi Billboard" },
      { name: "description", content: "Live and scheduled advertising campaigns across the Pi Billboard network." },
    ],
  }),
  component: Campaigns,
});

const rows = [
  { name: "Apex Velocity Run", venues: 7, status: "Live", spend: "1,204 π", impressions: "1.2M", progress: 72 },
  { name: "Pioneer Reward Drop", venues: 12, status: "Live", spend: "812 π", impressions: "840K", progress: 54 },
  { name: "Stadium Pulse 24", venues: 42, status: "Scheduled", spend: "0 π", impressions: "—", progress: 0 },
  { name: "Global Launch — Final", venues: 18, status: "Live", spend: "3,402 π", impressions: "2.8M", progress: 91 },
  { name: "Esports Night Reel", venues: 5, status: "Paused", spend: "210 π", impressions: "120K", progress: 30 },
];

function statusTone(s: string) {
  if (s === "Live") return "bg-success/20 text-success";
  if (s === "Paused") return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
}

function Campaigns() {
  return (
    <AppShell>
      <TopBar title="Campaigns" status={{ label: "5 Active" }} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium">All Campaigns</h2>
            <button className="bg-brand text-brand-foreground text-xs font-semibold px-3 py-1.5 rounded-lg">
              + New Campaign
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Venues</th>
                  <th className="px-6 py-3 font-medium">Spend</th>
                  <th className="px-6 py-3 font-medium">Impressions</th>
                  <th className="px-6 py-3 font-medium w-40">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.name} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium">{r.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusTone(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{r.venues}</td>
                    <td className="px-6 py-4 font-semibold text-brand">{r.spend}</td>
                    <td className="px-6 py-4 text-muted-foreground">{r.impressions}</td>
                    <td className="px-6 py-4">
                      <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${r.progress}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
