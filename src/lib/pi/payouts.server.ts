// Pi App-to-User (A2U) payout helper.
//
// Server-only. Implements the Pi Platform A2U payment lifecycle over HTTP:
//   1. POST /v2/payments                -> create the payment for a uid
//   2. (app wallet submits the Stellar transaction, yielding a txid)
//   3. POST /v2/payments/{id}/complete  -> settle with the txid
//
// Step 2 requires the app's wallet. When PI_WALLET_PRIVATE_SEED is not
// configured we stop after step 1 and leave the payout "approved" so an
// operator can settle it and post the txid back — we never fake a txid.

const PI_API_BASE = "https://api.minepi.com/v2";

export const TXID_RE = /^[a-zA-Z0-9]{16,128}$/;
export const PAYMENT_ID_RE = /^[a-zA-Z0-9_-]{6,128}$/;

function apiKey(): string | null {
  const key = process.env.PI_API_KEY;
  return key && key.length > 8 ? key : null;
}

export function walletConfigured(): boolean {
  const seed = process.env.PI_WALLET_PRIVATE_SEED;
  return Boolean(seed && seed.length > 8);
}

export interface A2UCreateResult {
  ok: boolean;
  paymentId?: string;
  error?: string;
}

/** Creates the A2U payment on the Pi Platform for the recipient uid. */
export async function createA2UPayment(params: {
  uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}): Promise<A2UCreateResult> {
  const key = apiKey();
  if (!key) return { ok: false, error: "pi_api_key_missing" };
  if (!(params.amount > 0)) return { ok: false, error: "invalid_amount" };

  try {
    const res = await fetch(`${PI_API_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment: {
          amount: params.amount,
          memo: params.memo.slice(0, 28),
          metadata: params.metadata,
          uid: params.uid,
        },
      }),
    });
    if (!res.ok) {
      console.error("[pi-a2u] create failed", res.status);
      return { ok: false, error: `pi_create_failed_${res.status}` };
    }
    const body = (await res.json()) as { identifier?: string };
    if (!body.identifier) return { ok: false, error: "pi_create_malformed" };
    return { ok: true, paymentId: body.identifier };
  } catch {
    return { ok: false, error: "pi_network_error" };
  }
}

/** Settles an A2U payment once the on-chain transaction id is known. */
export async function completeA2UPayment(
  paymentId: string,
  txid: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "pi_api_key_missing" };
  if (!PAYMENT_ID_RE.test(paymentId)) return { ok: false, error: "invalid_payment_id" };
  if (!TXID_RE.test(txid)) return { ok: false, error: "invalid_txid" };

  try {
    const res = await fetch(
      `${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      },
    );
    if (!res.ok) {
      console.error("[pi-a2u] complete failed", res.status);
      return { ok: false, error: `pi_complete_failed_${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "pi_network_error" };
  }
}

/** Cancels an A2U payment that can no longer be settled. */
export async function cancelA2UPayment(
  paymentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "pi_api_key_missing" };
  if (!PAYMENT_ID_RE.test(paymentId)) return { ok: false, error: "invalid_payment_id" };
  try {
    const res = await fetch(
      `${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`,
      { method: "POST", headers: { Authorization: `Key ${key}` } },
    );
    if (!res.ok) return { ok: false, error: `pi_cancel_failed_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "pi_network_error" };
  }
}

export function payoutNumber(): string {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PO-${stamp}-${rand}`;
}
