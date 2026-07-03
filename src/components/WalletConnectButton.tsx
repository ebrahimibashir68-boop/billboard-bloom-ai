import { useState } from "react";
import { Wallet, Loader2, Copy, Check } from "lucide-react";
import { usePi, PI_BROWSER_UNAVAILABLE_MESSAGE } from "@/lib/pi/usePi";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function shortAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletConnectButton() {
  const { status, user, walletAddress, hasScope, connectWallet } = usePi();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const connected = Boolean(user);
  const walletLinked = Boolean(walletAddress) || hasScope("wallet_address");

  const handleConnect = async () => {
    if (status === "unavailable") {
      toast.error(PI_BROWSER_UNAVAILABLE_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const result = await connectWallet();
      toast.success(
        result.walletAddress
          ? `Wallet connected: ${shortAddress(result.walletAddress)}`
          : "Wallet permission granted",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wallet connection failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy address");
    }
  };

  // Not yet connected → single call-to-action button.
  if (!connected || !walletLinked) {
    return (
      <button
        onClick={handleConnect}
        disabled={busy || status === "unavailable"}
        className="text-xs font-semibold py-2 px-3 flex items-center gap-2 rounded-lg border border-brand/40 text-brand hover:bg-brand/10 transition disabled:opacity-50"
        title="Connect your Pi Wallet"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Wallet className="size-3.5" />
        )}
        {busy ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  // Connected → chip that opens a small wallet info popover.
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="text-xs font-semibold py-2 px-3 flex items-center gap-2 rounded-lg border border-success/40 text-success hover:bg-success/10 transition"
          title="Pi Wallet connected"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-success opacity-70 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <Wallet className="size-3.5" />
          {walletAddress ? shortAddress(walletAddress) : "Wallet linked"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 bg-surface border border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-8 rounded-full bg-brand/15 text-brand flex items-center justify-center">
            <Wallet className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Pi Wallet</p>
            <p className="text-[11px] text-muted-foreground truncate">
              @{user?.username} · Mainnet
            </p>
          </div>
        </div>
        {walletAddress ? (
          <div className="rounded-md border border-border bg-background p-2 flex items-center gap-2">
            <code className="text-[11px] font-mono flex-1 truncate">{walletAddress}</code>
            <button
              onClick={copy}
              aria-label="Copy wallet address"
              className="size-7 rounded-md hover:bg-surface-elevated flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-background p-2 text-[11px] text-muted-foreground">
            Wallet permission granted. Address will appear here after your next payment approval.
          </div>
        )}
        <button
          onClick={handleConnect}
          disabled={busy}
          className="mt-3 w-full text-xs font-medium py-1.5 rounded-md border border-border hover:bg-surface-elevated transition disabled:opacity-50"
        >
          {busy ? "Reconnecting…" : "Reconnect wallet"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
