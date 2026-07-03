import { useCallback, useEffect, useState } from "react";
import type { PiAuthResult, PiPaymentDTO, PiSDK, PiScope } from "./types";

const SDK_URL = "https://sdk.minepi.com/pi-sdk.js";
export const PI_BROWSER_UNAVAILABLE_MESSAGE = "Pi SDK not available. Open this app inside Pi Browser to sign in.";
export const PI_PAYMENT_SCOPE_MESSAGE = "Payments permission is missing. Re-sign with Pi and approve the payments scope to continue.";
const DEFAULT_SCOPES: PiScope[] = ["username", "payments"];

let sdkPromise: Promise<PiSDK> | null = null;
let piSession: {
  user: PiAuthResult["user"] | null;
  scopes: PiScope[];
  walletAddress: string | null;
} = { user: null, scopes: [], walletAddress: null };
const sessionListeners = new Set<() => void>();

function publishSession(next: typeof piSession) {
  piSession = next;
  sessionListeners.forEach((listener) => listener());
}

function uniqueScopes(scopes: PiScope[]) {
  return Array.from(new Set(scopes));
}

function walletAddressFromAuthResult(result: PiAuthResult): string | null {
  const unknown = result as PiAuthResult & {
    wallet_address?: string;
    walletAddress?: string;
    user?: PiAuthResult["user"] & { wallet_address?: string; walletAddress?: string };
  };
  return (
    unknown.wallet_address ??
    unknown.walletAddress ??
    unknown.user?.wallet_address ??
    unknown.user?.walletAddress ??
    null
  );
}

function scopesFromAuthResult(result: PiAuthResult, requested: PiScope[]): PiScope[] {
  const unknownResult = result as PiAuthResult & {
    scopes?: PiScope[] | string;
    scope?: PiScope[] | string;
    user?: PiAuthResult["user"] & { scopes?: PiScope[] | string; scope?: PiScope[] | string };
  };
  const raw = unknownResult.scopes ?? unknownResult.scope ?? unknownResult.user?.scopes ?? unknownResult.user?.scope;
  if (Array.isArray(raw)) return raw.filter((scope): scope is PiScope => scope === "username" || scope === "payments" || scope === "wallet_address");
  if (typeof raw === "string") {
    return raw
      .split(/[\s,]+/)
      .filter((scope): scope is PiScope => scope === "username" || scope === "payments" || scope === "wallet_address");
  }
  return requested;
}


function loadPiSdk(): Promise<PiSDK> {
  if (typeof window === "undefined") return Promise.reject(new Error(PI_BROWSER_UNAVAILABLE_MESSAGE));
  if (window.Pi) return Promise.resolve(window.Pi);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<PiSDK>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const handle = async () => {
      if (!window.Pi) {
        reject(new Error(PI_BROWSER_UNAVAILABLE_MESSAGE));
        return;
      }
      try {
        // Pi.init may return a Promise — await it fully before any authenticate call.
        await Promise.resolve(window.Pi.init({ version: "2.0", sandbox: false }));
        resolve(window.Pi);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(PI_BROWSER_UNAVAILABLE_MESSAGE));
      }
    };
    if (existing) {
      if (window.Pi) void handle();
      else existing.addEventListener("load", () => void handle(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => void handle();
    s.onerror = () => reject(new Error(PI_BROWSER_UNAVAILABLE_MESSAGE));
    document.head.appendChild(s);
  });

  return sdkPromise;
}

export type PiStatus = "idle" | "loading" | "ready" | "unavailable";

const AUTO_LOGIN_KEY = "pi:auto-login";

export function usePi() {
  const [status, setStatus] = useState<PiStatus>("idle");
  const [session, setSession] = useState(piSession);

  useEffect(() => {
    const sync = () => setSession(piSession);
    sessionListeners.add(sync);
    return () => {
      sessionListeners.delete(sync);
    };
  }, []);

  const authenticate = useCallback(async (scopes: PiScope[] = DEFAULT_SCOPES) => {
    const requestedScopes = uniqueScopes(scopes);
    const Pi = await loadPiSdk();
    const result = await Pi.authenticate(requestedScopes, (incomplete) => {
      if (incomplete.transaction?.txid) {
        void fetch("/api/public/pi-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: incomplete.identifier,
            txid: incomplete.transaction.txid,
          }),
        });
      }
    });

    // Server-side validation: backend calls GET https://api.minepi.com/v2/me
    // with the access token before establishing a session.
    const res = await fetch("/api/public/pi-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: result.accessToken }),
    });
    if (!res.ok) {
      throw new Error("Pi access token rejected by server");
    }
    const verified = (await res.json()) as {
      user: { uid: string; username: string };
    };

    const grantedScopes = scopesFromAuthResult(result, requestedScopes);
    const nextScopes = uniqueScopes([...piSession.scopes, ...grantedScopes]);
    const nextWallet = walletAddressFromAuthResult(result) ?? piSession.walletAddress;
    publishSession({ user: verified.user, scopes: nextScopes, walletAddress: nextWallet });
    try {
      localStorage.setItem(AUTO_LOGIN_KEY, "1");
    } catch {
      // ignore
    }
    return { ...result, user: verified.user, scopes: nextScopes, walletAddress: nextWallet };

  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadPiSdk()
      .then(async () => {
        if (cancelled) return;
        setStatus("ready");
        // Automatic Pi login — runs silently inside the Pi Browser. We skip the
        // attempt only if the user explicitly signed out (flag === "0").
        let shouldAuto = true;
        try {
          shouldAuto = localStorage.getItem(AUTO_LOGIN_KEY) !== "0";
        } catch {
          // ignore
        }
        if (!shouldAuto) return;
        try {
          await authenticate(DEFAULT_SCOPES);
        } catch {
          // User cancelled or SDK error — stay signed out, keep auto-login enabled.
        }
      })
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [authenticate]);

  const signOut = useCallback(() => {
    publishSession({ user: null, scopes: [], walletAddress: null });
    try {
      localStorage.setItem(AUTO_LOGIN_KEY, "0");
    } catch {
      // ignore
    }
  }, []);

  const hasScope = useCallback((scope: PiScope) => piSession.scopes.includes(scope), []);
  const forgetScope = useCallback((scope: PiScope) => {
    publishSession({ ...piSession, scopes: piSession.scopes.filter((current) => current !== scope) });
  }, []);

  const connectWallet = useCallback(
    () => authenticate(["username", "payments", "wallet_address"]),
    [authenticate],
  );

  return {
    status,
    user: session.user,
    scopes: session.scopes,
    walletAddress: session.walletAddress,
    hasScope,
    authenticate,
    connectWallet,
    signOut,
    loadPiSdk,
    forgetScope,
  };
}


export type { PiPaymentDTO, PiScope };
