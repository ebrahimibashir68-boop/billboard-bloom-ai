import { createFileRoute } from "@tanstack/react-router";
import {
  approvePiPayment,
  assertPaymentOwnedAndFunded,
  bearer,
  SAFE_PI_ID_RE,
  verifyPiUser,
} from "@/lib/pi/platform.server";

export const Route = createFileRoute("/api/public/pi-approve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const accessToken = bearer(request);
          if (!accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = (await request.json().catch(() => null)) as { paymentId?: string } | null;
          const paymentId = body?.paymentId?.trim();
          if (!paymentId || !SAFE_PI_ID_RE.test(paymentId)) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const user = await verifyPiUser(accessToken);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const owned = await assertPaymentOwnedAndFunded({ paymentId, uid: user.uid });
          if (!owned.ok) {
            return Response.json({ error: owned.error }, { status: owned.status });
          }

          const approved = await approvePiPayment(paymentId);
          if (!approved) {
            return Response.json({ error: "Payment approval failed" }, { status: 400 });
          }
          return Response.json({ ok: true, amount: owned.amount });
        } catch (err) {
          console.error("[pi-approve] unexpected error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
