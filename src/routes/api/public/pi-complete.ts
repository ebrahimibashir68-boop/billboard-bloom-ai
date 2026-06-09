import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PI_API_BASE = "https://api.minepi.com/v2";

async function verifyPiUser(accessToken: string): Promise<{ uid: string; username: string } | null> {
  try {
    const res = await fetch(`${PI_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { uid?: string; username?: string };
    if (!data.uid || !data.username) return null;
    return { uid: data.uid, username: data.username };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/pi-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const accessToken = auth.toLowerCase().startsWith("bearer ")
            ? auth.slice(7).trim()
            : "";
          if (!accessToken || accessToken.length > 4096) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = (await request.json()) as { paymentId?: string; txid?: string };
          const paymentId = body.paymentId?.trim();
          const txid = body.txid?.trim();
          if (!paymentId || !txid || paymentId.length > 128 || txid.length > 128) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const user = await verifyPiUser(accessToken);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const key = process.env.PI_API_KEY;
          if (!key) {
            console.error("[pi-complete] PI_API_KEY missing — refusing to process payment");
            return Response.json({ error: "Payment service unavailable" }, { status: 503 });
          }

          // Look up the payment from Pi API to get authoritative amount + owner.
          const lookup = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
            headers: { Authorization: `Key ${key}` },
          });
          if (!lookup.ok) {
            const detail = await lookup.text();
            console.error("[pi-complete] payment lookup failed", lookup.status, detail);
            return Response.json({ error: "Payment completion failed" }, { status: 400 });
          }
          const payment = (await lookup.json()) as {
            user_uid?: string;
            amount?: number;
            memo?: string;
          };
          if (payment.user_uid !== user.uid) {
            console.warn("[pi-complete] uid mismatch", {
              caller: user.uid,
              payment: payment.user_uid,
            });
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }
          const verifiedAmount = typeof payment.amount === "number" ? payment.amount : 0;
          if (verifiedAmount <= 0) {
            return Response.json({ error: "Invalid payment amount" }, { status: 400 });
          }

          // Tell the Pi API we observed the txid and completed the payment.
          const complete = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: {
              Authorization: `Key ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ txid }),
          });
          if (!complete.ok) {
            const detail = await complete.text();
            console.error("[pi-complete] complete failed", complete.status, detail);
            return Response.json({ error: "Payment completion failed" }, { status: 400 });
          }

          // Idempotently record the payment. Conflict on payment_id means we've
          // already credited this deposit — do not credit twice.
          const { error: insertErr } = await supabaseAdmin
            .from("pi_payments")
            .insert({
              payment_id: paymentId,
              pi_uid: user.uid,
              txid,
              amount: verifiedAmount,
              memo: payment.memo ?? null,
            });

          let alreadyCredited = false;
          if (insertErr) {
            // Postgres unique_violation
            if ((insertErr as { code?: string }).code === "23505") {
              alreadyCredited = true;
            } else {
              console.error("[pi-complete] payment insert failed", insertErr);
              return Response.json({ error: "Internal error" }, { status: 500 });
            }
          }

          // Atomically increment the balance only if this was a new payment.
          // Using a SECURITY DEFINER RPC ensures concurrent deposits for the
          // same pi_uid cannot race on a read-modify-write and silently lose Pi.
          if (!alreadyCredited) {
            const { error: rpcErr } = await supabaseAdmin.rpc("credit_pi_balance", {
              p_pi_uid: user.uid,
              p_pi_username: user.username,
              p_amount: verifiedAmount,
            });
            if (rpcErr) {
              console.error("[pi-complete] balance credit failed", rpcErr);
              return Response.json({ error: "Internal error" }, { status: 500 });
            }
          }

          // Return the authoritative new balance for the client to display.
          const { data: latest } = await supabaseAdmin
            .from("pi_balances")
            .select("balance")
            .eq("pi_uid", user.uid)
            .maybeSingle();
          return Response.json({
            ok: true,
            amount: verifiedAmount,
            balance: Number(latest?.balance ?? 0),
            alreadyCredited,
          });
        } catch (err) {
          console.error("[pi-complete] unexpected error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
