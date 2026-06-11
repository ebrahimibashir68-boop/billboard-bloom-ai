import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/api/public/pi-approve")({
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

          const body = (await request.json()) as { paymentId?: string };
          const paymentId = body.paymentId?.trim();
          const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
          if (!paymentId || !SAFE_ID.test(paymentId)) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const user = await verifyPiUser(accessToken);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const key = process.env.PI_API_KEY;
          if (!key) {
            console.error("[pi-approve] PI_API_KEY missing — refusing to process payment");
            return Response.json({ error: "Payment service unavailable" }, { status: 503 });
          }

          // Fetch payment to ensure the caller owns it.
          const lookup = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
            headers: { Authorization: `Key ${key}` },
          });
          if (!lookup.ok) {
            const detail = await lookup.text();
            console.error("[pi-approve] payment lookup failed", lookup.status, detail);
            return Response.json({ error: "Payment approval failed" }, { status: 400 });
          }
          const payment = (await lookup.json()) as { user_uid?: string };
          if (payment.user_uid !== user.uid) {
            console.warn("[pi-approve] uid mismatch", { caller: user.uid, payment: payment.user_uid });
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
            method: "POST",
            headers: { Authorization: `Key ${key}` },
          });
          if (!res.ok) {
            const detail = await res.text();
            console.error("[pi-approve] approve failed", res.status, detail);
            return Response.json({ error: "Payment approval failed" }, { status: 400 });
          }
          return Response.json({ ok: true });
        } catch (err) {
          console.error("[pi-approve] unexpected error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
