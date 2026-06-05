import { createFileRoute } from "@tanstack/react-router";

const PI_API_BASE = "https://api.minepi.com/v2";

export const Route = createFileRoute("/api/public/pi-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { paymentId?: string; txid?: string };
          const paymentId = body.paymentId?.trim();
          const txid = body.txid?.trim();
          if (!paymentId || !txid || paymentId.length > 128 || txid.length > 128) {
            return Response.json({ error: "invalid payload" }, { status: 400 });
          }

          const key = process.env.PI_API_KEY;
          if (!key) {
            console.warn("[pi] PI_API_KEY not set — completing without server verification");
            return Response.json({ ok: true, simulated: true, paymentId, txid });
          }

          const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: {
              Authorization: `Key ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ txid }),
          });
          const text = await res.text();
          if (!res.ok) {
            return Response.json({ error: "complete failed", detail: text }, { status: res.status });
          }
          return new Response(text, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
