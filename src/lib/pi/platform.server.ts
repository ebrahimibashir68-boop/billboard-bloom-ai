// Canonical Pi Platform API client (server-only).
//
// Single source of truth for every call this app makes to the Pi Platform:
//   - GET  /v2/me                                  identity + granted scopes
//   - GET  /v2/payments/{id}                       authoritative payment state
//   - POST /v2/payments/{id}/approve               U2A approval
//   - POST /v2/payments/{id}/complete              U2A/A2U settlement
//   - POST /v2/payments/{id}/cancel                abort a stuck payment
//   - GET  /v2/payments/incomplete_server_payments recover stranded A2U payments
//   - GET  /v2/ads_network/status/{adId}           verify a rewarded ad
//
// The app runs on Pi Mainnet only — there is no sandbox/testnet branch here.
export const PI_API_BASE = "https://api.minepi.com/v2";
export const PI_NETWORK = "Pi Network" as const;

export const SAFE_PI_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
export const PI_TXID_RE = /^[a-zA-Z0-9]{16,128}$/;

export interface PiIdentity {
  uid: string;
  username: string;
  scopes: string[];
}

export interface PiPayment {
  identifier?: string;
  user_uid?: string;
  amount?: number;
  memo?: string;
  metadata?: Record<string, unknown>;
  network?: string;
  status?: {
    developer_approved?: boolean;
    transaction_verified?: boolean;
    developer_completed?: boolean;
    cancelled?: boolean;
    user_cancelled?: boolean;
  };
  transaction?: null | { txid?: string; verified?: boolean };
}

/** Reads the app's Pi Platform API key. Returns null when unconfigured. */
export function piApiKey(): string | null {
  const key = process.env.PI_API_KEY;
  return key && key.length > 8 ? key : null;
}

/** Extracts the Pi access token from an incoming request's Authorization header. */
export function bearer(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return token.length > 0 && token.length <= 4096 ? token : "";
}

/** Validates a Pi access token against /v2/me and returns the identity. */
export async function verifyPiUser(accessToken: string): Promise<PiIdentity | null> {
  if (!accessToken || accessToken.length > 4096) return null;
  try {
    const res = await fetch(`${PI_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      uid?: string;
      username?: string;
      credentials?: { scopes?: string[] };
    };
    if (!data.uid || !data.username) return null;
    return { uid: data.uid, username: data.username, scopes: data.credentials?.scopes ?? [] };
  } catch {
    return null;
  }
}

async function keyedFetch(path: string, init?: RequestInit) {
  const key = piApiKey();
  if (!key) return { ok: false as const, status: 503, body: null as unknown };
  const res = await fetch(`${PI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

/** Fetches the authoritative server-side view of a payment. */
export async function getPiPayment(paymentId: string): Promise<PiPayment | null> {
  if (!SAFE_PI_ID_RE.test(paymentId)) return null;
  const res = await keyedFetch(`/payments/${paymentId}`);
  if (!res.ok) {
    console.error("[pi-platform] payment lookup failed", paymentId.slice(0, 8), res.status);
    return null;
  }
  return (res.body ?? null) as PiPayment | null;
}

export async function approvePiPayment(paymentId: string): Promise<boolean> {
  if (!SAFE_PI_ID_RE.test(paymentId)) return false;
  const res = await keyedFetch(`/payments/${paymentId}/approve`, { method: "POST" });
  if (!res.ok) console.error("[pi-platform] approve failed", res.status);
  return res.ok;
}

/** Public Pi Mainnet blockchain API (Horizon-compatible). */
export const PI_HORIZON_BASE = "https://api.mainnet.minepi.com";

/** Lowest protocol version the app's payment flows are verified against. */
export const PI_MIN_SUPPORTED_PROTOCOL = 27;

export interface PiNetworkStatus {
  reachable: boolean;
  currentProtocol: number | null;
  supportedProtocol: number | null;
  coreVersion: string | null;
  horizonVersion: string | null;
  /** True when the chain runs at least PI_MIN_SUPPORTED_PROTOCOL. */
  protocolReady: boolean;
}

/**
 * Reads the live Pi Mainnet state from the blockchain's root endpoint.
 * Protocol 27 (CAP-0071 auth delegation) is the baseline this app targets;
 * the result lets the UI warn if the network ever reports something older.
 */
export async function getPiNetworkStatus(): Promise<PiNetworkStatus> {
  const empty: PiNetworkStatus = {
    reachable: false,
    currentProtocol: null,
    supportedProtocol: null,
    coreVersion: null,
    horizonVersion: null,
    protocolReady: false,
  };
  try {
    const res = await fetch(`${PI_HORIZON_BASE}/`, { headers: { Accept: "application/json" } });
    if (!res.ok) return empty;
    const data = (await res.json()) as {
      current_protocol_version?: number;
      supported_protocol_version?: number;
      core_version?: string;
      horizon_version?: string;
    };
    const current = typeof data.current_protocol_version === "number" ? data.current_protocol_version : null;
    return {
      reachable: true,
      currentProtocol: current,
      supportedProtocol: typeof data.supported_protocol_version === "number" ? data.supported_protocol_version : null,
      coreVersion: data.core_version ?? null,
      horizonVersion: data.horizon_version ?? null,
      protocolReady: current != null && current >= PI_MIN_SUPPORTED_PROTOCOL,
    };
  } catch {
    return empty;
  }
}

export type ChainCheck = "verified" | "rejected" | "unavailable";

/**
 * Independently looks up a transaction on the Pi blockchain.
 * "rejected" = definitively bad (not found after retries, failed, or the memo
 * doesn't match this payment). "unavailable" = the chain API couldn't be
 * reached; callers then rely on the Pi Platform's own verification.
 */
export async function verifyTxOnChain(txid: string, paymentId: string): Promise<ChainCheck> {
  if (!SAFE_PI_ID_RE.test(txid)) return "rejected";
  // A fresh transaction can take a ledger close (~5s) to appear.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${PI_HORIZON_BASE}/transactions/${txid}`, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 404) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) return "unavailable";
      const tx = (await res.json()) as { successful?: boolean; memo?: string; memo_type?: string };
      if (tx.successful !== true) return "rejected";
      // Pi U2A payments carry the payment identifier as the text memo.
      if (tx.memo_type === "text" && tx.memo && tx.memo !== paymentId) return "rejected";
      return "verified";
    } catch {
      return "unavailable";
    }
  }
  return "rejected";
}

export async function completePiPayment(paymentId: string, txid: string): Promise<boolean> {
  if (!SAFE_PI_ID_RE.test(paymentId) || !SAFE_PI_ID_RE.test(txid)) return false;
  const chain = await verifyTxOnChain(txid, paymentId);
  if (chain === "rejected") {
    console.error("[pi-platform] on-chain check rejected tx", txid.slice(0, 8));
    return false;
  }
  if (chain === "unavailable") console.warn("[pi-platform] chain API unavailable; relying on Pi Platform verification");
  const res = await keyedFetch(`/payments/${paymentId}/complete`, {
    method: "POST",
    body: JSON.stringify({ txid }),
  });
  if (!res.ok) console.error("[pi-platform] complete failed", res.status);
  return res.ok;
}

export async function cancelPiPayment(paymentId: string): Promise<boolean> {
  if (!SAFE_PI_ID_RE.test(paymentId)) return false;
  const res = await keyedFetch(`/payments/${paymentId}/cancel`, { method: "POST" });
  return res.ok;
}

/**
 * Lists A2U payments the Pi Platform still considers unfinished for this app.
 * The Pi docs require the app to resolve these before creating new payouts.
 */
export async function listIncompleteServerPayments(): Promise<PiPayment[]> {
  const res = await keyedFetch(`/payments/incomplete_server_payments`);
  if (!res.ok) return [];
  const body = res.body as { incomplete_server_payments?: PiPayment[] } | null;
  return body?.incomplete_server_payments ?? [];
}

/**
 * Confirms that the caller actually owns a payment and that the amount covers
 * an expected cost. Returns a discriminated result the routes can map to HTTP.
 */
export async function assertPaymentOwnedAndFunded(params: {
  paymentId: string;
  uid: string;
  minAmount?: number;
}): Promise<
  | { ok: true; payment: PiPayment; amount: number }
  | { ok: false; status: 400 | 403 | 409 | 503; error: string }
> {
  if (!piApiKey()) {
    console.error("[pi-platform] PI_API_KEY missing");
    return { ok: false, status: 503, error: "Payment service unavailable" };
  }
  const payment = await getPiPayment(params.paymentId);
  if (!payment) return { ok: false, status: 400, error: "Payment verification failed" };
  if (payment.user_uid !== params.uid) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (payment.status?.cancelled || payment.status?.user_cancelled) {
    return { ok: false, status: 409, error: "Payment was cancelled" };
  }
  const amount = typeof payment.amount === "number" ? payment.amount : 0;
  if (!(amount > 0)) return { ok: false, status: 400, error: "Invalid payment amount" };
  if (params.minAmount != null && amount < params.minAmount - 0.000001) {
    return { ok: false, status: 409, error: "Payment amount does not match the requested purchase" };
  }
  return { ok: true, payment, amount };
}

export interface PiAdStatus {
  identifier: string;
  mediator_ack_status: "granted" | "revoked" | "failed" | null;
  mediator_granted_at?: string | null;
}

/**
 * Verifies a rewarded ad server-side before granting anything of value.
 * Client-reported AD_REWARDED results are never trusted on their own.
 */
export async function getPiAdStatus(adId: string): Promise<PiAdStatus | null> {
  if (!SAFE_PI_ID_RE.test(adId)) return null;
  const res = await keyedFetch(`/ads_network/status/${adId}`);
  if (!res.ok) return null;
  const body = res.body as
    | { identifier?: string; mediator_ack_status?: PiAdStatus["mediator_ack_status"]; mediator_granted_at?: string }
    | null;
  if (!body?.identifier) return null;
  return {
    identifier: body.identifier,
    mediator_ack_status: body.mediator_ack_status ?? null,
    mediator_granted_at: body.mediator_granted_at ?? null,
  };
}
