import type { PiSDK } from "./types";

/** Share initialization, including SDK instances already injected by Pi Browser. */
const initialized = new WeakMap<PiSDK, Promise<PiSDK>>();

export function initializePiSdk(sdk: PiSDK): Promise<PiSDK> {
  const existing = initialized.get(sdk);
  if (existing) return existing;
  const ready = Promise.resolve()
    .then(() => sdk.init({ version: "2.0", sandbox: false }))
    .then(() => sdk)
    .catch((error: unknown) => {
      initialized.delete(sdk);
      throw error;
    });
  initialized.set(sdk, ready);
  return ready;
}