import { useId, useMemo, useState } from "react";
import { Loader2, X, ShieldCheck, AlertTriangle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { usePi, PI_BROWSER_UNAVAILABLE_MESSAGE, PI_PAYMENT_SCOPE_MESSAGE } from "@/lib/pi/usePi";
import { PLACEMENTS, computeCost, type Placement } from "@/lib/pi/pricing";

type Stage =
  | { kind: "idle" }
  | { kind: "auth" }
  | { kind: "creating" }
  | { kind: "approving"; paymentId: string }
  | { kind: "completing"; paymentId: string; txid: string }
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
  const { status, user, hasScope, authenticate, loadPiSdk, forgetScope } = usePi();
  const [title, setTitle] = useState("Launch Spot");
  const [placement, setPlacement] = useState<Placement>("stadium");
  const [days, setDays] = useState(7);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const titleId = useId();
  const daysId = useId();

  const cost = useMemo(() => computeCost(placement, days), [placement, days]);
  const busy = !["idle", "done", "error"].includes(stage.kind);

  if (!open) return null;

  const close = () => {
    if (busy) return;
    setStage({ kind: "idle" });
    onClose();
  };

  const handlePurchase = async () => {
    if (cost <= 0 || !title.trim()) return;
    try {
      if (status !== "ready") {
        setStage({ kind: "error", message: PI_BROWSER_UNAVAILABLE_MESSAGE });
        return;
      }

      if (user && !hasScope("payments")) {
        forgetScope("payments");
      }

      setStage({ kind: "auth" });
      const auth = await authenticate(["username", "payments"]);
      if (!auth.scopes.includes("payments")) {
        setStage({ kind: "error", message: PI_PAYMENT_SCOPE_MESSAGE });
        return;
      }
      const accessToken = auth.accessToken;

      setStage({ kind: "creating" });
      const Pi = await loadPiSdk();

      await Pi.createPayment(
        {
          amount: cost,
          memo: `Pi Billboard: ${title.trim()}`.slice(0, 28),
          metadata: { kind: "campaign_purchase", title: title.trim(), placement, days },
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            setStage({ kind: "approving", paymentId });
            const res = await fetch("/api/public/pi-approve", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ paymentId }),
            });
            if (!res.ok) throw new Error("Approval failed");
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            setStage({ kind: "completing", paymentId, txid });
            const res = await fetch("/api/public/pi-campaigns", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                title: title.trim(),
                placement,
                durationDays: days,
                paymentId,
                txid,
              }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) throw new Error(data.error || "Campaign creation failed");
            setStage({ kind: "done" });
            toast.success(`Campaign launched — ${cost} π`, { description: `${title.trim()} · ${days}d` });
            onPurchased?.();
          },
          onCancel: () => {
            setStage({ kind: "error", message: "Payment cancelled." });
          },
          onError: (err) => {
            const message = err.message || "Unknown Pi error";
            if (message.toLowerCase().includes("payments") && message.toLowerCase().includes("scope")) {
              forgetScope("payments");
              setStage({ kind: "error", message: PI_PAYMENT_SCOPE_MESSAGE });
              return;
            }
            setStage({ kind: "error", message });
          },
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      if (message.toLowerCase().includes("payments") && message.toLowerCase().includes("scope")) {
        forgetScope("payments");
        setStage({ kind: "error", message: PI_PAYMENT_SCOPE_MESSAGE });
        return;
      }
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
          {/* Connection status */}
          <div className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Connection status</p>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  status === "ready"
                    ? "text-success border-success/40 bg-success/10"
                    : status === "loading"
                    ? "text-brand border-brand/40 bg-brand/10"
                    : "text-destructive border-destructive/40 bg-destructive/10"
                }`}
              >
                {status === "ready" ? "ONLINE" : status === "loading" ? "CONNECTING" : "OFFLINE"}
              </span>
            </div>
            <StatusRow
              label="Pi SDK"
              state={status === "ready" ? "ok" : status === "loading" ? "pending" : "fail"}
              detail={status === "ready" ? "Loaded from sdk.minepi.com" : status === "loading" ? "Loading…" : "Not available"}
            />
            <StatusRow
              label="Wallet / account"
              state={user ? "ok" : status === "ready" ? "warn" : "pending"}
              detail={user ? `Signed in as @${user.username}` : status === "ready" ? "Not signed in" : "Waiting for SDK"}
            />
            <StatusRow
              label="Payments scope"
              state={hasScope("payments") ? "ok" : user ? "warn" : "pending"}
              detail={hasScope("payments") ? "Granted" : user ? "Missing — re-sign required" : "Requested on sign-in"}
            />
            <StatusRow label="Network" state="ok" detail="Pi Mainnet" />
          </div>

          {status === "unavailable" && (
            <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs">
              <WifiOff className="size-4 shrink-0 mt-0.5 text-destructive" />
              <div className="space-y-2">
                <p className="font-semibold text-destructive">Wallet not reachable</p>
                <p className="text-muted-foreground">Open this app inside Pi Browser to launch a paid campaign from your wallet.</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 mt-1 text-brand hover:brightness-110 font-medium"
                >
                  <RefreshCw className="size-3" /> Retry connection
                </button>
              </div>
            </div>
          )}

          {status === "ready" && user && !hasScope("payments") && (
            <div className="flex gap-3 p-3 rounded-lg bg-brand/10 border border-brand/30 text-xs">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-brand" />
              <div>
                <p className="font-semibold text-brand">Payments permission required</p>
                <p className="text-muted-foreground mt-1">Re-sign with Pi and approve the payments scope to launch this campaign.</p>
              </div>
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

          <div className="p-4 bg-background border border-border rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total cost</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Amount due</span>
              <span className="text-2xl font-bold text-brand tabular-nums">{cost} π</span>
            </div>
          </div>

          {stage.kind !== "idle" && (
            <div className="text-xs space-y-1 p-3 bg-background rounded-xl border border-border font-mono">
              <StageLine label="Authenticate" active={stage.kind === "auth"} done={!!user && !["auth"].includes(stage.kind)} />
              <StageLine label="Create payment" active={stage.kind === "creating"} done={["approving", "completing", "done"].includes(stage.kind)} />
              <StageLine label="Server approval" active={stage.kind === "approving"} done={["completing", "done"].includes(stage.kind)} />
              <StageLine label="Blockchain settle" active={stage.kind === "completing"} done={stage.kind === "done"} />
              {stage.kind === "done" && (
                <p className="text-success mt-2 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" /> Campaign live on-chain.
                </p>
              )}
              {stage.kind === "error" && <p className="text-destructive mt-2">{stage.message}</p>}
            </div>
          )}

          <button
            onClick={stage.kind === "done" ? close : handlePurchase}
            disabled={status !== "ready" || busy || cost <= 0 || !title.trim()}
            className="w-full py-3 bg-brand text-brand-foreground font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {stage.kind === "done" ? "Close" : busy ? "Processing…" : `Launch · ${cost} π`}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            This campaign will be paid directly from your Pi wallet. The txid is recorded on the ledger before the campaign goes live.
          </p>
        </div>
      </div>
    </div>
  );
}

function StageLine({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const color = done ? "text-success" : active ? "text-brand" : "text-muted-foreground";
  const symbol = done ? "✓" : active ? "•" : "○";
  return (
    <p className={color}>
      <span className="inline-block w-4">{symbol}</span> {label}
      {active && <span className="ml-1 animate-pulse">…</span>}
    </p>
  );
}

type RowState = "ok" | "warn" | "fail" | "pending";
function StatusRow({ label, state, detail }: { label: string; state: RowState; detail: string }) {
  const dot =
    state === "ok"
      ? "bg-success shadow-[0_0_6px_hsl(var(--success))]"
      : state === "warn"
      ? "bg-brand shadow-[0_0_6px_hsl(var(--brand))]"
      : state === "fail"
      ? "bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]"
      : "bg-muted-foreground/40 animate-pulse";
  const Icon = state === "ok" ? Wifi : state === "fail" ? WifiOff : AlertTriangle;
  const iconColor =
    state === "ok" ? "text-success" : state === "fail" ? "text-destructive" : state === "warn" ? "text-brand" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`size-1.5 rounded-full ${dot}`} />
      <Icon className={`size-3 ${iconColor}`} />
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-foreground/90 truncate flex-1">{detail}</span>
    </div>
  );
}
