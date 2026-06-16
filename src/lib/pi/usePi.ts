import { useCallback, useEffect, useState } from "react";
import type { PiAuthResult, PiPaymentDTO, PiSDK } from "./types";

const SDK_URL = "https://sdk.minepi.com/pi-sdk.js";

let sdkPromise: Promise<PiSDK> | null = null;

function loadPiSdk(): Promise<PiSDK> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Pi) return Promise.resolve(window.Pi);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<PiSDK>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const handle = async () => {
      if (!window.Pi) {
        reject(new Error("Pi SDK failed to load"));
        return;
      }
      try {
        // Pi.init may return a Promise — await it fully before any authenticate call.
        await Promise.resolve(window.Pi.init({ version: "2.0", sandbox: true }));
        resolve(window.Pi);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Pi.init failed"));
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
    s.onerror = () => reject(new Error("Failed to load Pi SDK"));
    document.head.appendChild(s);
  });

  return sdkPromise;
}

export type PiStatus = "idle" | "loading" | "ready" | "unavailable";

const AUTO_LOGIN_KEY = "pi:auto-login";

export function usePi() {
  const [status, setStatus] = useState<PiStatus>("idle");
  const [user, setUser] = useState<PiAuthResult["user"] | null>(null);

  const authenticate = useCallback(async () => {
    const Pi = await loadPiSdk();
    const result = await Pi.authenticate(["username"], (incomplete) => {
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

    setUser(verified.user);
    try {
      localStorage.setItem(AUTO_LOGIN_KEY, "1");
    } catch {
      // ignore
    }
    return { ...result, user: verified.user };
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
          await authenticate();
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
    setUser(null);
    try {
      localStorage.setItem(AUTO_LOGIN_KEY, "0");
    } catch {
      // ignore
    }
  }, []);

  return { status, user, authenticate, signOut, loadPiSdk };
}

export type { PiPaymentDTO };
