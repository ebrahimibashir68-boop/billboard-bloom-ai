import { useId, useMemo, useState } from "react";
import { Loader2, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePi } from "@/lib/pi/usePi";
import { useBalance } from "@/lib/pi/BalanceContext";
import { PLACEMENTS, computeCost, type Placement } from "@/lib/pi/pricing";

type Stage =
  | { kind: "idle" }
  | { kind: "auth" }
  | { kind: "charging" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export function PurchaseCampaignDialog({
  open,
  onClose,
  onPurchased,
}: {
  open: boolean;
  onClose: () => void;
  onPurchased?: () => void;
}) {
  const { status, authenticate } = usePi();
  const { balance, setBalance } = useBalance();
  const [title, setTitle] = useState("Launch Spot");
  const [placement, setPlacement] = useState<Placement>("stadium");
  const [days, setDays] = useState(7);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const titleId = useId();
  const daysId = useId();

  const cost = useMemo(() => computeCost(placement, days), [placement, days]);
  const busy = stage.kind === "auth" || stage.kind === "charging";
  const insufficient = balance !== null && balance < cost;

  if (!open) return null;

  const close = () => {
    if (busy) return;
    setStage({ kind: "idle" });
    onClose();
  };

  const handlePurchase = async () => {
    if (cost <= 0 || !title.trim()) return;
    try {
      setStage({ kind: "auth" });
      const auth = await authenticate();
      const accessToken = auth.accessToken;

      setStage({ kind: "charging" });
      const res = await fetch("/api/public/pi-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title: title.trim(), placement, durationDays: days }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; balance?: number };
      if (!res.ok) throw new Error(data.error || "Purchase failed");
      if (typeof data.balance === "number") setBalance(data.balance);
      setStage({ kind: "done" });
      toast.success(`Campaign launched — ${cost} π`, { description: `${title} · ${days}d` });
      onPurchased?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      setStage({ kind: "error", message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl ring-1 ring-white/5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">New Campaign</h2>
          <button onClick={close} disabled={busy} aria-label="Close new campaign dialog" className="text-muted-foreground hover:text-foreground disabled:opacity-30">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {status === "unavailable" && (
            <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
              <p className="text-muted-foreground">Open in Pi Browser to launch a paid campaign.</p>
            </div>
          )}

          <div>
            <label htmlFor={titleId} className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Campaign name</label>
            <input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="mt-2 w-full p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Placement</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PLACEMENTS.map((p) => {
                const active = p.id === placement;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlacement(p.id)}
                    className={`text-left p-3 rounded-xl border transition ${
                      active
                        ? "bg-brand/10 border-brand/40"
                        : "bg-surface-elevated border-border hover:border-border/80"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? "text-brand" : "text-foreground"}`}>{p.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.blurb}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{p.multiplier}× base</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor={daysId} className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Duration · {days} day{days === 1 ? "" : "s"}
            </label>
            <input
              id={daysId}
              type="range"
              min={1}
              max={30}
              step={1}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
              className="w-full mt-2 accent-brand"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total cost</p>
              <p className="text-2xl font-bold text-brand tabular-nums">{cost} π</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your balance</p>
              <p className={`text-sm font-semibold tabular-nums ${insufficient ? "text-destructive" : "text-foreground"}`}>
                {balance === null ? "— π" : `${balance.toFixed(2)} π`}
              </p>
            </div>
          </div>

          {insufficient && (
            <p className="text-xs text-destructive">Not enough Pi. Deposit more from the top bar.</p>
          )}

          {stage.kind === "done" && (
            <p className="text-success text-xs flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Campaign live.
            </p>
          )}
          {stage.kind === "error" && <p className="text-destructive text-xs">{stage.message}</p>}

          <button
            onClick={stage.kind === "done" ? close : handlePurchase}
            disabled={status !== "ready" || busy || cost <= 0 || !title.trim() || insufficient}
            className="w-full py-3 bg-brand text-brand-foreground font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {stage.kind === "done" ? "Close" : busy ? "Processing…" : `Launch · ${cost} π`}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            Paid from your Pi balance. No new Pi transaction required.
          </p>
        </div>
      </div>
    </div>
  );
}
