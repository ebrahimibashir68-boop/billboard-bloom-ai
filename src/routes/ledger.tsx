import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Blocks, Check, X, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "On-Chain Ledger · Pi Billboard" },
      { name: "description", content: "Publicly verifiable, tamper-evident hash-chain of every billboard play, booking, and π payment." },
      { property: "og:title", content: "Pi Billboard Ledger" },
      { property: "og:description", content: "Every play and payment anchored to a SHA-256 chain, publicly verifiable." },
    ],
  }),
  component: LedgerPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface Entry {
  seq: number;
  prev_hash: string;
  hash: string;
  kind: string;
  ref_table: string;
  ref_id: string | null;
  payload: Record<string, unknown>;
  pi_txid: string | null;
  created_at: string;
}
interface Integrity { ok: boolean; checked: number; first_bad_seq: number | null; }

function LedgerPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/public/verify-ledger?limit=100");
      const j = (await res.json()) as { entries: Entry[]; integrity: Integrity };
      setEntries(j.entries);
      setIntegrity(j.integrity);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <TopBar title="Pi Billboard" />
      <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-6">
        <header>
          <div className="inline-flex items-center gap-2 text-xs text-brand font-mono uppercase tracking-widest mb-2">
            <Blocks className="size-3.5" /> Public proof-of-play ledger
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">Every play, on the chain</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Every booking, invoice payment, and screen-acknowledged play is appended to a SHA-256 hash-chain. Anyone can re-verify the chain end-to-end — no rewrites, no silent edits.</p>
        </header>

        <div className={`p-5 rounded-xl border ${integrity?.ok ? "border-green-500/40 bg-green-500/5" : "border-destructive/40 bg-destructive/5"} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {integrity?.ok ? <Check className="size-6 text-green-500" /> : <X className="size-6 text-destructive" />}
            <div>
              <div className="font-medium">{integrity?.ok ? "Ledger integrity verified" : "Integrity mismatch detected"}</div>
              <div className="text-xs text-muted-foreground">{integrity ? `${integrity.checked.toLocaleString()} entries checked${integrity.first_bad_seq ? ` — first bad seq #${integrity.first_bad_seq}` : ""}` : "Loading…"}</div>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg border border-border text-sm flex items-center gap-2 hover:bg-surface disabled:opacity-50">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Re-verify
          </button>
        </div>

        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.seq} className="p-4 rounded-xl border border-border bg-surface font-mono text-xs space-y-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-brand/10 text-brand uppercase">{e.kind}</span>
                  <span className="text-muted-foreground">#{e.seq}</span>
                </div>
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <div><span className="text-muted-foreground">hash</span> <span className="break-all">{e.hash}</span></div>
              <div className="text-muted-foreground text-[10px]">prev {e.prev_hash.slice(0, 16)}…</div>
              {e.pi_txid && <div><span className="text-muted-foreground">π txid</span> <span className="text-brand">{e.pi_txid}</span></div>}
              <div className="text-muted-foreground text-[11px] font-sans pt-1">{JSON.stringify(e.payload)}</div>
            </div>
          ))}
          {entries.length === 0 && !loading && <div className="text-sm text-muted-foreground p-4">No ledger entries yet.</div>}
        </div>
      </div>
    </AppShell>
  );
}
