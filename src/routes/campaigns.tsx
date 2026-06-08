import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { PurchaseCampaignDialog } from "@/components/PurchaseCampaignDialog";
import { usePi } from "@/lib/pi/usePi";
import { useBalance } from "@/lib/pi/BalanceContext";
import { PLACEMENTS } from "@/lib/pi/pricing";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — Pi Billboard" },
      { name: "description", content: "Live and scheduled advertising campaigns across the Pi Billboard network." },
    ],
  }),
  component: Campaigns,
});

interface CampaignRow {
  id: string;
  title: string;
  placement: string;
  duration_days: number;
  cost_pi: number;
  status: string;
  starts_at: string;
  ends_at: string;
}

function statusTone(s: string) {
  if (s === "active") return "bg-success/20 text-success";
  if (s === "paused") return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
}

function placementLabel(id: string) {
  return PLACEMENTS.find((p) => p.id === id)?.label ?? id;
}

function progress(starts: string, ends: string) {
  const s = new Date(starts).getTime();
  const e = new Date(ends).getTime();
  const now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

function Campaigns() {
  const { authenticate, status } = usePi();
  const { setBalance } = useBalance();
  const [rows, setRows] = useState<CampaignRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const auth = await authenticate();
      const [campaignsRes, balRes] = await Promise.all([
        fetch("/api/public/pi-campaigns", { headers: { Authorization: `Bearer ${auth.accessToken}` } }),
        fetch("/api/public/pi-balance", {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
      ]);
      if (!campaignsRes.ok) throw new Error("Failed to load campaigns");
      const data = (await campaignsRes.json()) as { campaigns: CampaignRow[] };
      setRows(data.campaigns);
      if (balRes.ok) {
        const b = (await balRes.json()) as { balance?: number };
        if (typeof b.balance === "number") setBalance(b.balance);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Load failed");
      setRows([]);
    }
  }, [authenticate, setBalance]);

  useEffect(() => {
    if (status === "ready") void load();
  }, [status, load]);

  const activeCount = rows?.filter((r) => r.status === "active").length ?? 0;

  return (
    <AppShell>
      <TopBar title="Campaigns" status={activeCount ? { label: `${activeCount} Active` } : undefined} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium">All Campaigns</h2>
            <button
              onClick={() => setOpen(true)}
              className="bg-brand text-brand-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:brightness-110 transition"
            >
              + New Campaign
            </button>
          </div>

          {status === "unavailable" && (
            <div className="px-6 py-4 text-xs text-muted-foreground border-b border-border">
              Open in the Pi Browser to view and create campaigns.
            </div>
          )}
          {loadError && (
            <div className="px-6 py-4 text-xs text-destructive border-b border-border">{loadError}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Placement</th>
                  <th className="px-6 py-3 font-medium">Spend</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium w-40">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows === null && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-muted-foreground">Loading…</td></tr>
                )}
                {rows && rows.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-xs text-muted-foreground">
                    No campaigns yet. Click <span className="text-brand font-semibold">+ New Campaign</span> to launch your first.
                  </td></tr>
                )}
                {rows?.map((r) => {
                  const pct = progress(r.starts_at, r.ends_at);
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-medium">{r.title}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusTone(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{placementLabel(r.placement)}</td>
                      <td className="px-6 py-4 font-semibold text-brand tabular-nums">{Number(r.cost_pi).toFixed(2)} π</td>
                      <td className="px-6 py-4 text-muted-foreground">{r.duration_days}d</td>
                      <td className="px-6 py-4">
                        <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PurchaseCampaignDialog
        open={open}
        onClose={() => setOpen(false)}
        onPurchased={() => {
          setOpen(false);
          void load();
        }}
      />
    </AppShell>
  );
}
