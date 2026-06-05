import { createFileRoute } from "@tanstack/react-router";

const PI_API_BASE = "https://api.minepi.com/v2";

export const Route = createFileRoute("/api/public/pi-approve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { paymentId?: string };
          const paymentId = body.paymentId?.trim();
          if (!paymentId || paymentId.length > 128) {
            return Response.json({ error: "invalid paymentId" }, { status: 400 });
          }

          const key = process.env.PI_API_KEY;
          if (!key) {
            // Dev fallback so the flow is testable without a Pi developer key.
            console.warn("[pi] PI_API_KEY not set — approving without server verification");
            return Response.json({ ok: true, simulated: true });
          }

          const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
            method: "POST",
            headers: { Authorization: `Key ${key}` },
          });
          const text = await res.text();
          if (!res.ok) {
            return Response.json({ error: "approve failed", detail: text }, { status: res.status });
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
