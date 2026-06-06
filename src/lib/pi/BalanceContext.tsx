import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface BalanceCtx {
  /** Server-verified Pi balance. `null` until the user authenticates and we fetch it. */
  balance: number | null;
  /** Update with an authoritative server value (e.g. from /api/public/pi-balance or /pi-complete). */
  setBalance: (next: number) => void;
}

const Ctx = createContext<BalanceCtx | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  // Balance is server-owned. We do NOT persist or seed from localStorage —
  // the client must never be the source of truth for credit balance.
  const [balance, setBalanceState] = useState<number | null>(null);

  const setBalance = useCallback((next: number) => {
    setBalanceState(Number.isFinite(next) ? next : 0);
  }, []);

  return <Ctx.Provider value={{ balance, setBalance }}>{children}</Ctx.Provider>;
}

export function useBalance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBalance must be used inside BalanceProvider");
  return ctx;
}
