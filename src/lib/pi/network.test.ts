import { describe, expect, it } from "vitest";
import { parsePiNetworkStatus } from "./network";
import { getPiNetworkStatus } from "./platform.server";
import { vi } from "vitest";

describe("Pi Mainnet protocol reporting", () => {
  it("recognizes the observed Protocol 28 target", () => {
    expect(parsePiNetworkStatus({ current_protocol_version: 28 })).toMatchObject({
      reachable: true, currentProtocol: 28, targetProtocol: 28, targetReached: true, protocolReady: true,
    });
  });
  it("keeps Protocol 27 compatible without calling it the latest target", () => {
    expect(parsePiNetworkStatus({ current_protocol_version: 27 })).toMatchObject({
      protocolReady: true, targetReached: false,
    });
  });
  it("rejects a protocol below the previous baseline", () => {
    expect(parsePiNetworkStatus({ current_protocol_version: 26 }).protocolReady).toBe(false);
  });
  it.each([null, {}, { current_protocol_version: "28" }, { current_protocol_version: 28.5 }])("never marks malformed network data as ready: %j", (value) => {
    expect(parsePiNetworkStatus(value)).toMatchObject({ reachable: false, protocolReady: false, targetReached: false });
  });
  it("reports network failure as unconfirmed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    try {
      expect(await getPiNetworkStatus()).toMatchObject({ reachable: false, targetReached: false });
    } finally { vi.unstubAllGlobals(); }
  });
});