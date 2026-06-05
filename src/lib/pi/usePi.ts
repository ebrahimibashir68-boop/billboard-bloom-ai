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
    const handle = () => {
      if (window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: true });
        resolve(window.Pi);
      } else {
        reject(new Error("Pi SDK failed to load"));
      }
    };
    if (existing) {
      if (window.Pi) handle();
      else existing.addEventListener("load", handle, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = handle;
    s.onerror = () => reject(new Error("Failed to load Pi SDK"));
    document.head.appendChild(s);
  });

  return sdkPromise;
}

export type PiStatus = "idle" | "loading" | "ready" | "unavailable";

export function usePi() {
  const [status, setStatus] = useState<PiStatus>("idle");
  const [user, setUser] = useState<PiAuthResult["user"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadPiSdk()
      .then(() => !cancelled && setStatus("ready"))
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  const authenticate = useCallback(async () => {
    const Pi = await loadPiSdk();
    const result = await Pi.authenticate(["username", "payments"], (incomplete) => {
      // Best-effort: ask server to complete a leftover payment.
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
    setUser(result.user);
    return result;
  }, []);

  return { status, user, authenticate, loadPiSdk };
}

export type { PiPaymentDTO };
