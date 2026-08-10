import { useEffect, useState } from "react";
import { LogIn, RefreshCw, Smartphone } from "lucide-react";
import { usePi, PI_BROWSER_UNAVAILABLE_MESSAGE } from "@/lib/pi/usePi";

export function PiAuthGate({ children }: { children: React.ReactNode }) {
  const { status, user, authenticate } = usePi();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and the first client paint we render children so public pages
  // remain crawlable and the shell does not flash a blocking overlay.
  if (!mounted) return <>{children}</>;

  const signedIn = status === "ready" && user != null;
  if (signedIn) return <>{children}</>;

  const unavailable = status === "unavailable";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6 text-center">
      <div className="size-16 rounded-2xl bg-brand flex items-center justify-center shadow-[0_0_40px_-8px_var(--color-brand)] mb-6">
        <div className="size-10 border-4 border-background rounded-full flex items-center justify-center font-bold text-brand-foreground text-xl">
          π
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight max-w-md">
        {unavailable ? "Open this app in Pi Browser" : "Sign in with Pi"}
      </h1>
      <p className="text-sm text-muted-foreground mt-3 max-w-sm">
        {unavailable
          ? "Pi Billboard runs on the Pi Network. Open it inside the Pi Browser to connect your wallet and continue."
          : "Authenticate with your Pi identity to access the global billboard network, pay in π, and verify every play on-chain."}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {unavailable ? (
          <>
            <a
              href="https://minepi.com/download"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:brightness-110 transition"
            >
              <Smartphone className="size-4" />
              Get Pi Browser
            </a>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-elevated transition"
            >
              <RefreshCw className="size-4" />
              Retry connection
            </button>
          </>
        ) : (
          <button
            onClick={() => void authenticate()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:brightness-110 transition"
          >
            <LogIn className="size-4" />
            Sign in with Pi
          </button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-8 max-w-xs">
        All payments settle on the Pi Network Mainnet. No fiat, no simulated currency, no custodial balances.
      </p>
    </div>
  );
}
