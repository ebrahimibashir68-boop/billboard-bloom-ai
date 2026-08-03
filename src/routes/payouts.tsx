import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Wallet, RefreshCw, ArrowUpRight, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";
import { PAYOUT_STATUS_LABELS, fmtPi } from "@/lib/ooh/standards";
import { toast } from "sonner";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "Pi Revenue Share Payouts · Pi Billboard" },
      {
        name: "description",
        content:
          "Billboard partners and screen operators withdraw their revenue share in Pi through App-to-User payouts, with every transaction on the ledger.",
      },
      { property: "og:title", content: "Pi Revenue Share Payouts" },
      {
        property: "og:description",
        content:
          "Media owners withdraw earnings in Pi via App-to-User payouts, reconciled against paid invoices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pi Revenue Share Payouts" },
      {
        name: "twitter:description",
        content: "Withdraw billboard earnings in Pi with full ledger reconciliation.",
      },
    ],
  }),
  component: PayoutsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface Partner {
  id: string;
  company_name: string;
  revenue_share_pct: number;
  payment_terms: string;
  min_payout_pi: number;
  status: string;
}
interface Payout {
  id: string;
  payout_number: string;
  partner_id: string | null;
  amount_pi: number;
  gross_pi: number;
  revenue_share_pct: number;
  kind: string;
  status: string;
  pi_txid: string | null;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
}
interface Earnings {
  gross: number;
  earned: number;
  paidOut: number;
  available: number;
}

function PayoutsPage() {
  const { user, authenticate } = usePi();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [earnings, setEarnings] = useState<Record<string, Earnings>>({});
  const [walletReady, setWalletReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-payouts", {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (!res.ok) throw new Error("Could not load payouts");
      const j = (await res.json()) as {
        partners: Partner[];
        payouts: Payout[];
        earnings: Record<string, Earnings>;
        wallet_ready: boolean;
      };
      setPartners(j.partners);
      setPayouts(j.payouts);
      setEarnings(j.earnings);
      setWalletReady(j.wallet_ready);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in with Pi to view payouts");
    } finally {
      setLoading(false);
    }
  }, [authenticate]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function requestPayout(partnerId: string) {
    setBusy(partnerId);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ action: "request", partner_id: partnerId }),
      });
      const j = (await res.json()) as { error?: string; pi_payment_opened?: boolean };
      if (!res.ok) throw new Error(j.error ?? "Payout request failed");
      toast.success(
        j.pi_payment_opened
          ? "Payout approved — Pi payment opened for settlement"
          : "Payout queued for settlement",
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payout request failed");
    } finally {
      setBusy(null);
    }
  }

  const totalPaid = payouts
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount_pi), 0);

  return (
    <AppShell>
      <TopBar title="Pi Billboard" titleAs="h2" />
      <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
        <header>
          <div className="inline-flex items-center gap-2 text-xs text-brand font-mono uppercase tracking-widest mb-2">
            <Wallet className="size-3.5" /> App-to-User settlement
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">Revenue share payouts in Pi</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Media owners and screen operators earn their contracted share of every paid invoice
            and withdraw it straight to their Pi wallet. Payouts are reconciled against paid
            invoices minus any credit notes, and every settlement is appended to the ledger.
          </p>
        </header>

        {!walletReady && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3 text-sm">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Settlement wallet not configured</div>
              <p className="text-muted-foreground mt-1">
                Payout requests are recorded and opened on the Pi Platform, but the final
                on-chain transfer needs the app wallet to be configured before it can be
                completed automatically.
              </p>
            </div>
          </div>
        )}

        {!user && (
          <p className="text-sm text-muted-foreground rounded-xl border border-border bg-surface p-4">
            Sign in with Pi to see your partner earnings and request a payout.
          </p>
        )}

        {user && partners.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground rounded-xl border border-border bg-surface p-4">
            No billboard partner account is linked to @{user.username} yet. Register as a
            billboard operator to start earning revenue share.
          </p>
        )}

        <section className="space-y-3">
          {partners.map((p) => {
            const e = earnings[p.id] ?? { gross: 0, earned: 0, paidOut: 0, available: 0 };
            return (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">{p.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.revenue_share_pct}% revenue share · {p.payment_terms.replace(/_/g, " ")}{" "}
                      · min {fmtPi(Number(p.min_payout_pi))} · {p.status}
                    </div>
                  </div>
                  <button
                    onClick={() => void requestPayout(p.id)}
                    disabled={busy === p.id || e.available <= 0}
                    className="text-xs font-semibold rounded-lg bg-brand text-brand-foreground px-3 py-2 inline-flex items-center gap-2 ring-1 ring-brand/30 hover:brightness-110 disabled:opacity-40"
                  >
                    <ArrowUpRight className="size-3.5" />
                    {busy === p.id ? "Requesting…" : "Withdraw in Pi"}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Gross billed", value: fmtPi(e.gross) },
                    { label: "Your share", value: fmtPi(e.earned) },
                    { label: "Already paid", value: fmtPi(e.paidOut) },
                    { label: "Available now", value: fmtPi(e.available) },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {s.label}
                      </div>
                      <div className="text-sm font-semibold tabular-nums">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Payout history · {fmtPi(totalPaid)} settled
            </h2>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="text-xs inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-border bg-surface p-4">
              No payouts yet.
            </p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm truncate">{p.payout_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.kind.replace(/_/g, " ")} · {new Date(p.created_at).toLocaleString()}
                      {p.pi_txid ? ` · tx ${p.pi_txid.slice(0, 10)}…` : ""}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-brand">
                    {fmtPi(Number(p.amount_pi))}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {PAYOUT_STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
