import { ShieldCheck } from "lucide-react";

export function PiComplianceFooter() {
  return (
    <footer className="shrink-0 border-t border-border bg-background/60 backdrop-blur-md px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success))]" />
          <span className="font-medium text-foreground/80">Pi Network Mainnet</span>
          <span className="hidden sm:inline">·</span>
          <span>All values shown in π</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3 text-success" />
            Pi-compliant settlement
          </span>
          <span>U2A deposits · A2U payouts · on-chain ledger</span>
        </div>
      </div>
    </footer>
  );
}
