import { useState } from "react";
import { Loader2, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePi } from "@/lib/pi/usePi";
import { useBalance } from "@/lib/pi/BalanceContext";

const PRESETS = [10, 50, 100, 500];

type Stage =
  | { kind: "idle" }
  | { kind: "auth" }
  | { kind: "creating" }
  | { kind: "approving"; paymentId: string }
  | { kind: "completing"; paymentId: string; txid: string }
  | { kind: "done"; amount: number }
  | { kind: "error"; message: string };

export function DepositPiDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, user, authenticate, loadPiSdk } = usePi();
  const { setBalance } = useBalance();
  const [amount, setAmount] = useState<number>(50);
  const [memo, setMemo] = useState("Pi Billboard ad credit");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });

  if (!open) return null;

  const busy = !["idle", "done", "error"].includes(stage.kind);

  const handleDeposit = async () => {
    if (amount <= 0) return;
    try {
      // 1. Authenticate (always get a fresh access token for server calls)
      setStage({ kind: "auth" });
      const auth = await authenticate();
      const accessToken = auth.accessToken;

      // 2. Create payment via SDK
      setStage({ kind: "creating" });
      const Pi = await loadPiSdk();

      await Pi.createPayment(
        {
          amount,
          memo,
          metadata: { product: "ad_credit", source: "deposit_dialog" },
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
            const res = await fetch("/api/public/pi-complete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ paymentId, txid }),
            });
            if (!res.ok) throw new Error("Completion failed");
            const data = (await res.json()) as { amount?: number; balance?: number };
            // Use ONLY the server-verified amount + balance. Never the client input.
            const verified = typeof data.amount === "number" ? data.amount : 0;
            if (typeof data.balance === "number") setBalance(data.balance);
            setStage({ kind: "done", amount: verified });
            toast.success(`Deposited ${verified} π`, { description: `Tx ${txid.slice(0, 10)}…` });
          },
          onCancel: () => {
            setStage({ kind: "error", message: "Payment cancelled." });
          },
          onError: (err) => {
            setStage({ kind: "error", message: err.message || "Unknown Pi error" });
          },
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      setStage({ kind: "error", message });
    }
  };

  const close = () => {
    if (busy) return;
    setStage({ kind: "idle" });
    onClose();
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
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-brand flex items-center justify-center text-brand-foreground font-bold">π</div>
            <h2 className="text-base font-semibold">Deposit Pi</h2>
          </div>
          <button onClick={close} disabled={busy} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {status === "unavailable" && (
            <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive-foreground">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Open in Pi Browser</p>
                <p className="text-muted-foreground mt-1">
                  Pi payments only work inside the Pi Browser app. Download it from{" "}
                  <a href="https://minepi.com/download" className="underline" target="_blank" rel="noreferrer">
                    minepi.com
                  </a>{" "}
                  and revisit this page.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Amount</label>
            <div className="mt-2 flex items-center gap-2 p-3 bg-background border border-border rounded-xl">
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-transparent text-2xl font-semibold focus:outline-none"
              />
              <span className="text-brand font-bold text-lg">π</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`py-2 text-xs rounded-lg border transition ${
                    amount === p
                      ? "bg-brand/10 border-brand/40 text-brand"
                      : "bg-surface-elevated border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p} π
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Memo</label>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={28}
              className="mt-2 w-full p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {stage.kind !== "idle" && (
            <div className="text-xs space-y-1 p-3 bg-background rounded-xl border border-border font-mono">
              <StageLine label="Authenticate" active={stage.kind === "auth"} done={!!user && stage.kind !== "auth"} />
              <StageLine label="Create payment" active={stage.kind === "creating"} done={["approving", "completing", "done"].includes(stage.kind)} />
              <StageLine label="Server approval" active={stage.kind === "approving"} done={["completing", "done"].includes(stage.kind)} />
              <StageLine label="Blockchain settle" active={stage.kind === "completing"} done={stage.kind === "done"} />
              {stage.kind === "done" && (
                <p className="text-success mt-2 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" /> Deposit confirmed.
                </p>
              )}
              {stage.kind === "error" && <p className="text-destructive mt-2">{stage.message}</p>}
            </div>
          )}

          <button
            onClick={stage.kind === "done" ? close : handleDeposit}
            disabled={status !== "ready" || busy || amount <= 0}
            className="w-full py-3 bg-brand text-brand-foreground font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {stage.kind === "done" ? "Close" : busy ? "Processing…" : `Deposit ${amount} π`}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            Powered by Pi Network SDK · Sandbox mode
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
