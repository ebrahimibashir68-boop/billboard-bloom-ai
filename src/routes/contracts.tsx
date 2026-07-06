import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { SmartContractDialog } from "@/components/SmartContractDialog";
import { usePi } from "@/lib/pi/usePi";
import { useBalance } from "@/lib/pi/BalanceContext";
import { PLACEMENTS } from "@/lib/pi/pricing";
import { FileCheck2, MapPin, Sparkles } from "lucide-react";

export const Route = createFileRoute("/contracts")({
  head: () => ({
    meta: [
      { title: "Smart Contracts — Pi Billboard" },
      {
        name: "description",
        content:
          "Sign verifiable smart contracts to run text and image ads on live billboards worldwide. AI distributes each contract across matched venues, settled in Pi.",
      },
      { property: "og:title", content: "Smart Contracts — Pi Billboard" },
      {
        property: "og:description",
        content:
          "Create on-chain-verifiable ad contracts and let AI place them on stadium billboards worldwide, paid in Pi.",
      },
      { property: "og:url", content: "https://billboard-bloom-ai.lovable.app/contracts" },
    ],
    links: [{ rel: "canonical", href: "https://billboard-bloom-ai.lovable.app/contracts" }],
  }),
  component: ContractsPage,
});

interface PlacementRow {
  id: string;
  contract_id: string;
  venue_code: string;
  venue_name: string;
  sport: string;
  ai_match_score: number;
  ai_reasoning: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

interface ContractRow {
  id: string;
  tier: "individual" | "enterprise";
  title: string;
  body_text: string;
  image_url: string | null;
  placements: string[];
  duration_days: number;
  target_venues: number;
  cost_pi: number;
  contract_hash: string;
  status: string;
  activated_at: string | null;
  ends_at: string | null;
  created_at: string;
  placements_matched: PlacementRow[];
}

function placementLabel(id: string) {
  return PLACEMENTS.find((p) => p.id === id)?.label ?? id;
}

function ContractsPage() {
  const { authenticate, status, user } = usePi();
  const { setBalance } = useBalance();
  const [rows, setRows] = useState<ContractRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const auth = await authenticate();
      const [res, balRes] = await Promise.all([
        fetch("/api/public/pi-contracts", {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
        fetch("/api/public/pi-balance", {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
      ]);
      if (!res.ok) throw new Error("Failed to load contracts");
      const data = (await res.json()) as { contracts: ContractRow[] };
      setRows(data.contracts);
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
    if (status === "ready" && user) void load();
  }, [status, user, load]);

  const active = rows?.filter((r) => r.status === "active").length ?? 0;

  return (
    <AppShell>
      <TopBar
        title="Smart Contracts"
        status={active ? { label: `${active} Live Contracts` } : undefined}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section className="bg-surface border border-border rounded-2xl ring-1 ring-white/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileCheck2 className="size-4 text-brand" /> Verifiable ad contracts, paid in Pi
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-[60ch]">
              Individuals and enterprises sign a hashed contract with their Pi identity. AI
              distributes matched venues worldwide, then rotates plays for the full duration.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="bg-brand text-brand-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:brightness-110 transition whitespace-nowrap"
          >
            + New Contract
          </button>
        </section>

        {status === "unavailable" && (
          <div className="text-xs text-muted-foreground bg-surface border border-border rounded-xl p-4">
            Open in Pi Browser to sign smart contracts.
          </div>
        )}
        {loadError && (
          <div className="text-xs text-destructive bg-surface border border-border rounded-xl p-4">
            {loadError}
          </div>
        )}

        {rows === null && (
          <div className="text-xs text-muted-foreground">Loading contracts…</div>
        )}
        {rows && rows.length === 0 && (
          <div className="text-xs text-muted-foreground bg-surface border border-border rounded-xl p-6 text-center">
            No contracts yet. Click <span className="text-brand font-semibold">+ New Contract</span>{" "}
            to sign your first.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows?.map((c) => (
            <article
              key={c.id}
              className="bg-surface border border-border rounded-2xl ring-1 ring-white/5 p-5 flex flex-col gap-4"
            >
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{c.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                      {c.tier}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.body_text}</p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    c.status === "active"
                      ? "bg-success/20 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.status}
                </span>
              </header>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                <div>
                  <p className="uppercase tracking-wider">Cost</p>
                  <p className="text-sm font-semibold text-brand">{Number(c.cost_pi).toFixed(2)} π</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider">Duration</p>
                  <p className="text-sm font-semibold text-foreground">{c.duration_days}d</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider">Venues</p>
                  <p className="text-sm font-semibold text-foreground">
                    {c.placements_matched.length}/{c.target_venues}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {c.placements.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated border border-border text-muted-foreground"
                  >
                    {placementLabel(p)}
                  </span>
                ))}
              </div>

              {c.placements_matched.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1">
                    <Sparkles className="size-3 text-brand" /> AI-matched venues
                  </p>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {c.placements_matched
                      .slice()
                      .sort((a, b) => b.ai_match_score - a.ai_match_score)
                      .map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 text-xs bg-background/60 rounded-lg px-2 py-1.5"
                        >
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{p.venue_name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.sport}</span>
                          <span className="text-[10px] font-mono text-brand">
                            {Math.round(Number(p.ai_match_score))}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <footer className="border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Contract hash
                </p>
                <p className="font-mono text-[10px] text-foreground/70 break-all mt-1">
                  {c.contract_hash}
                </p>
              </footer>
            </article>
          ))}
        </div>
      </div>

      <SmartContractDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          void load();
        }}
      />
    </AppShell>
  );
}
