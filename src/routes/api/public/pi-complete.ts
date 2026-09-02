import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  assertPaymentOwnedAndFunded,
  bearer,
  completePiPayment,
  SAFE_PI_ID_RE,
  verifyPiUser,
} from "@/lib/pi/platform.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/pi-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const accessToken = bearer(request);
          if (!accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = (await request.json().catch(() => null)) as {
            paymentId?: string;
            txid?: string;
            invoice_id?: string;
          } | null;
          const paymentId = body?.paymentId?.trim();
          const txid = body?.txid?.trim();
          const invoiceId = body?.invoice_id?.trim();
          if (!paymentId || !txid || !SAFE_PI_ID_RE.test(paymentId) || !SAFE_PI_ID_RE.test(txid)) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }
          if (invoiceId && !UUID_RE.test(invoiceId)) {
            return Response.json({ error: "Invalid invoice" }, { status: 400 });
          }

          const user = await verifyPiUser(accessToken);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          // Authoritative Pi Platform check: the payment must exist, belong to
          // the caller and carry a positive amount.
          const owned = await assertPaymentOwnedAndFunded({ paymentId, uid: user.uid });
          if (!owned.ok) {
            return Response.json({ error: owned.error }, { status: owned.status });
          }
          const { payment, amount: verifiedAmount } = owned;

          // Tell the Pi Platform we observed the txid and completed the payment.
          const completed = await completePiPayment(paymentId, txid);
          if (!completed) {
            return Response.json({ error: "Payment completion failed" }, { status: 400 });
          }

          // Invoice payment path: settle the booking invoice directly on-chain
          // instead of crediting the advertiser's internal balance.
          if (invoiceId) {
            const { data, error: rpcErr } = await supabaseAdmin.rpc("pay_booking_invoice_with_pi", {
              p_pi_uid: user.uid,
              p_invoice_id: invoiceId,
              p_payment_id: paymentId,
              p_txid: txid,
              p_amount: verifiedAmount,
            });
            if (rpcErr) {
              const msg = (rpcErr.message || "").toLowerCase();
              if (msg.includes("not_found")) {
                return Response.json({ error: "Invoice not found" }, { status: 404 });
              }
              if (msg.includes("already_paid")) {
                return Response.json({ ok: true, plays_created: 0, alreadyPaid: true });
              }
              if (msg.includes("insufficient")) {
                return Response.json(
                  { error: "Payment amount does not match invoice" },
                  { status: 409 },
                );
              }
              console.error("[pi-complete] invoice settlement failed", rpcErr);
              return Response.json({ error: "Invoice settlement failed" }, { status: 500 });
            }
            const row = Array.isArray(data) ? data[0] : data;
            return Response.json({
              ok: true,
              amount: verifiedAmount,
              plays_created: Number(row?.plays_created ?? 0),
              invoice_id: invoiceId,
            });
          }

          // Deposit path: idempotently record the payment and credit the balance.
          const { error: insertErr } = await supabaseAdmin.from("pi_payments").insert({
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
