/** Pi SDK payments remain compatible with the previously supported baseline. */
export const PI_MIN_SUPPORTED_PROTOCOL = 27;
/** Latest protocol observed on Pi's official Mainnet endpoint. */
export const PI_CURRENT_PROTOCOL_TARGET = 28;

export interface PiNetworkStatus {
  reachable: boolean;
  currentProtocol: number | null;
  supportedProtocol: number | null;
  coreVersion: string | null;
  horizonVersion: string | null;
  protocolReady: boolean;
  targetProtocol: number;
  targetReached: boolean;
}

export function parsePiNetworkStatus(value: unknown): PiNetworkStatus {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const protocol = (value: unknown) =>
    typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
  const current = protocol(data.current_protocol_version);
  return {
    reachable: current !== null,
    currentProtocol: current,
    supportedProtocol: protocol(data.supported_protocol_version),
    coreVersion: typeof data.core_version === "string" ? data.core_version : null,
    horizonVersion: typeof data.horizon_version === "string" ? data.horizon_version : null,
    protocolReady: current !== null && current >= PI_MIN_SUPPORTED_PROTOCOL,
    targetProtocol: PI_CURRENT_PROTOCOL_TARGET,
    targetReached: current !== null && current >= PI_CURRENT_PROTOCOL_TARGET,
  };
}