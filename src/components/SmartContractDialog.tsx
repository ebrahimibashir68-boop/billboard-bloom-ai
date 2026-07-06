import { useId, useMemo, useState, useEffect } from "react";
import { Loader2, X, ShieldCheck, AlertTriangle, FileCheck2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePi } from "@/lib/pi/usePi";
import { useBalance } from "@/lib/pi/BalanceContext";
import { PLACEMENTS, type Placement } from "@/lib/pi/pricing";
import {
  buildCanonicalContract,
  canonicalStringify,
  computeContractCost,
  hashContract,
  TIER_LIMITS,
  type ContractTier,
} from "@/lib/pi/contracts";

type Stage =
  | { kind: "idle" }
  | { kind: "auth" }
  | { kind: "signing" }
  | { kind: "done"; hash: string }
  | { kind: "error"; message: string };

export function SmartContractDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { status, authenticate, user } = usePi();
  const { balance, setBalance } = useBalance();
  const [tier, setTier] = useState<ContractTier>("individual");
  const [title, setTitle] = useState("Launch Spot");
  const [bodyText, setBodyText] = useState("Introducing our new flagship — worldwide, this weekend.");
  const [imageUrl, setImageUrl] = useState("");
  const [placements, setPlacements] = useState<Placement[]>(["stadium"]);
  const [days, setDays] = useState(7);
  const [targetVenues, setTargetVenues] = useState(3);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [previewHash, setPreviewHash] = useState<string>("…");
  const titleId = useId();
  const bodyId = useId();
  const imgId = useId();
  const daysId = useId();
  const venuesId = useId();

  const limits = TIER_LIMITS[tier];

  // Clamp inputs when tier changes.
  useEffect(() => {
    setPlacements((prev) => {
      const clamped = prev.slice(0, limits.placements[1]);
      return clamped.length >= limits.placements[0] ? clamped : (["stadium"] as Placement[]);
    });
    setTargetVenues((v) => Math.min(Math.max(v, limits.venues[0]), limits.venues[1]));
    setDays((d) => Math.min(Math.max(d, limits.days[0]), limits.days[1]));
  }, [tier, limits.placements, limits.venues, limits.days]);

  const cost = useMemo(
    () => computeContractCost(tier, placements, days, targetVenues),
    [tier, placements, days, targetVenues],
  );

  // Live-preview the canonical contract hash so users see the "on-chain" hash
  // change as they edit. Real hash is recomputed server-side too.
  const canonicalPreview = useMemo(
    () =>
      buildCanonicalContract(
        {
          tier,
          title,
          bodyText,
          imageUrl: imageUrl || null,
          placements,
          durationDays: days,
          targetVenues,
        },
        {
          pi_uid: user?.uid ?? "preview",
          pi_username: user?.username ?? "preview",
        },
        cost,
        // Zero-out issued_at for stable preview hash.
        "1970-01-01T00:00:00.000Z",
      ),
    [tier, title, bodyText, imageUrl, placements, days, targetVenues, cost, user],
  );

  useEffect(() => {
    let alive = true;
    hashContract(canonicalPreview)
      .then((h) => alive && setPreviewHash(h))
      .catch(() => alive && setPreviewHash("?"));
    return () => {
      alive = false;
    };
  }, [canonicalPreview]);

  const busy = stage.kind === "auth" || stage.kind === "signing";
  const insufficient = balance !== null && balance < cost;

  if (!open) return null;

  const close = () => {
    if (busy) return;
    setStage({ kind: "idle" });
    onClose();
  };

  const togglePlacement = (id: Placement) => {
    setPlacements((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= limits.placements[0]) return prev;
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= limits.placements[1]) {
        // Individual: replace single placement.
        return [id];
      }
      return [...prev, id];
    });
  };

  const handleSign = async () => {
    if (cost <= 0 || !title.trim() || !bodyText.trim()) return;
    try {
      setStage({ kind: "auth" });
      const auth = await authenticate();
      setStage({ kind: "signing" });
      const res = await fetch("/api/public/pi-contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          tier,
          title: title.trim(),
          bodyText: bodyText.trim(),
          imageUrl: imageUrl.trim() || undefined,
          placements,
          durationDays: days,
          targetVenues,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hash?: string;
        balance?: number;
      };
      if (!res.ok || !data.hash) throw new Error(data.error || "Contract signing failed");
      if (typeof data.balance === "number") setBalance(data.balance);
      setStage({ kind: "done", hash: data.hash });
      toast.success(`Contract signed — ${cost} π`, {
        description: `Hash ${data.hash.slice(0, 12)}…`,
      });
      onCreated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Contract signing failed";
      setStage({ kind: "error", message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={close}
    >
      <div
        className="w-full max-w-lg my-8 bg-surface border border-border rounded-2xl ring-1 ring-white/5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-4 text-brand" />
            <h2 className="text-base font-semibold">New Smart Contract</h2>
          </div>
          <button
            onClick={close}
            disabled={busy}
            aria-label="Close smart contract dialog"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {status === "unavailable" && (
            <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
              <p className="text-muted-foreground">
                Open in Pi Browser to sign a smart contract with your Pi identity.
              </p>
            </div>
          )}

          {/* Tier picker */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Advertiser tier
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["individual", "enterprise"] as ContractTier[]).map((t) => {
                const active = t === tier;
                return (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`text-left p-3 rounded-xl border transition ${
                      active
                        ? "bg-brand/10 border-brand/40"
                        : "bg-surface-elevated border-border hover:border-border/80"
                    }`}
                  >
                    <p className={`text-sm font-semibold capitalize ${active ? "text-brand" : ""}`}>
                      {t}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t === "individual"
                        ? "1 placement · up to 5 venues"
                        : "up to 4 placements · 5–50 venues · 15% volume off"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor={titleId}
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Campaign title
            </label>
            <input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="mt-2 w-full p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Body text */}
          <div>
            <label
              htmlFor={bodyId}
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Ad copy · shown by AI on billboards
            </label>
            <textarea
              id={bodyId}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-2 w-full p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
            />
          </div>

          {/* Optional image */}
          <div>
            <label
              htmlFor={imgId}
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Image URL (optional)
            </label>
            <input
              id={imgId}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              maxLength={500}
              className="mt-2 w-full p-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Placements */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Placements ({tier === "individual" ? "pick 1" : `${limits.placements[0]}–${limits.placements[1]}`})
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PLACEMENTS.map((p) => {
                const active = placements.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlacement(p.id)}
                    className={`text-left p-3 rounded-xl border transition ${
                      active
                        ? "bg-brand/10 border-brand/40"
                        : "bg-surface-elevated border-border hover:border-border/80"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? "text-brand" : ""}`}>{p.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.multiplier}× base</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label
              htmlFor={daysId}
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Duration · {days} day{days === 1 ? "" : "s"}
            </label>
            <input
              id={daysId}
              type="range"
              min={limits.days[0]}
              max={limits.days[1]}
              step={1}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || limits.days[0])}
              className="w-full mt-2 accent-brand"
            />
          </div>

          {/* Target venues */}
          <div>
            <label
              htmlFor={venuesId}
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Target venues · {targetVenues}
            </label>
            <input
              id={venuesId}
              type="range"
              min={limits.venues[0]}
              max={limits.venues[1]}
              step={1}
              value={targetVenues}
              onChange={(e) =>
                setTargetVenues(parseInt(e.target.value, 10) || limits.venues[0])
              }
              className="w-full mt-2 accent-brand"
            />
          </div>

          {/* Contract hash preview */}
          <div className="p-3 bg-background border border-border rounded-xl space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="size-3 text-brand" /> Verifiable contract hash (SHA-256)
            </p>
            <p className="font-mono text-[10px] break-all text-foreground/80">{previewHash}</p>
            <details className="text-[10px] text-muted-foreground">
              <summary className="cursor-pointer">Canonical payload preview</summary>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-foreground/70">
                {canonicalStringify(canonicalPreview)}
              </pre>
            </details>
          </div>

          {/* Cost */}
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total cost</p>
              <p className="text-2xl font-bold text-brand tabular-nums">{cost} π</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Your balance
              </p>
              <p
                className={`text-sm font-semibold tabular-nums ${insufficient ? "text-destructive" : "text-foreground"}`}
              >
                {balance === null ? "— π" : `${balance.toFixed(2)} π`}
              </p>
            </div>
          </div>

          {insufficient && (
            <p className="text-xs text-destructive">
              Not enough Pi. Deposit more from the top bar.
            </p>
          )}

          {stage.kind === "done" && (
            <div className="text-success text-xs flex items-start gap-1.5">
              <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Contract signed. Hash <span className="font-mono">{stage.hash.slice(0, 20)}…</span>
              </span>
            </div>
          )}
          {stage.kind === "error" && <p className="text-destructive text-xs">{stage.message}</p>}

          <button
            onClick={stage.kind === "done" ? close : handleSign}
            disabled={
              status !== "ready" ||
              busy ||
              cost <= 0 ||
              !title.trim() ||
              !bodyText.trim() ||
              insufficient
            }
            className="w-full py-3 bg-brand text-brand-foreground font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {stage.kind === "done"
              ? "Close"
              : busy
              ? stage.kind === "auth"
                ? "Signing in…"
                : "Signing contract…"
              : `Sign contract · ${cost} π`}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            Paid from your Pi balance. AI distributes to matched venues automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
