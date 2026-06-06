import { Plus } from "lucide-react";
import { useState } from "react";
import { DepositPiDialog } from "./DepositPiDialog";
import { useBalance } from "@/lib/pi/BalanceContext";

export function TopBar({
  title,
  status,
}: {
  title: string;
  status?: { label: string; tone?: "live" | "neutral" };
}) {
  const [open, setOpen] = useState(false);
  const { balance } = useBalance();

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/60 backdrop-blur-md z-10 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        {status && (
          <div className="flex items-center gap-2 px-2 py-1 bg-success/10 rounded-full">
            <div className="size-1.5 bg-success rounded-full animate-pulse" />
            <span className="text-[10px] font-medium text-success uppercase tracking-wider whitespace-nowrap">
              {status.label}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            Available Balance
          </span>
          <span className="text-sm font-semibold text-brand tabular-nums">
            {balance === null
              ? "— π"
              : `${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} π`}
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-brand text-brand-foreground text-sm font-semibold py-2 px-3 flex items-center gap-2 rounded-lg ring-1 ring-brand/30 hover:brightness-110 transition"
        >
          <Plus className="size-4" />
          Deposit Pi
        </button>
      </div>

      <DepositPiDialog open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
