import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface BalanceCtx {
  balance: number;
  add: (amount: number) => void;
}

const Ctx = createContext<BalanceCtx | null>(null);
const KEY = "pi_billboard_balance";

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number>(4290.5);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setBalance(parseFloat(raw));
    } catch {
      // ignore
    }
  }, []);

  const add = useCallback((amount: number) => {
    setBalance((prev) => {
      const next = prev + amount;
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ balance, add }}>{children}</Ctx.Provider>;
}

export function useBalance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBalance must be used inside BalanceProvider");
  return ctx;
}
