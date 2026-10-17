import { describe, expect, it, vi } from "vitest";
import { initializePiSdk } from "./sdk";
import type { PiSDK } from "./types";

function fakeSdk(init: PiSDK["init"]): PiSDK {
  return { init, authenticate: vi.fn(), createPayment: vi.fn(), nativeFeaturesList: vi.fn() };
}

describe("Pi SDK Mainnet initialization", () => {
  it("awaits initialization once before preloaded SDK consumers proceed", async () => {
    let release: (() => void) | undefined;
    const init = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const sdk = fakeSdk(init);
    let resolved = false;
    const first = initializePiSdk(sdk);
    const second = initializePiSdk(sdk);
    void first.then(() => { resolved = true; });
    await Promise.resolve();
    expect(first).toBe(second);
    expect(resolved).toBe(false);
    expect(init).toHaveBeenCalledExactlyOnceWith({ version: "2.0", sandbox: false });
    if (!release) throw new Error("Initialization never started");
    release();
    expect(await first).toBe(sdk);
    expect(resolved).toBe(true);
  });
  it("allows retry after initialization fails", async () => {
    const init = vi.fn().mockRejectedValueOnce(new Error("startup failed")).mockResolvedValue(undefined);
    const sdk = fakeSdk(init);
    await expect(initializePiSdk(sdk)).rejects.toThrow("startup failed");
    expect(await initializePiSdk(sdk)).toBe(sdk);
    expect(init).toHaveBeenCalledTimes(2);
  });
});