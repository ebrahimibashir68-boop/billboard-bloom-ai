import { createFileRoute } from "@tanstack/react-router";
import {
  bearer,
  getPiAdStatus,
  piApiKey,
  SAFE_PI_ID_RE,
  verifyPiUser,
} from "@/lib/pi/platform.server";

/**
 * Verifies a rewarded ad with the Pi Ads Network before the app grants
 * anything of value. The client's AD_REWARDED result is only a hint; the
 * mediator acknowledgement fetched here is authoritative.
 */
export const Route = createFileRoute("/api/public/pi-ad-reward")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const accessToken = bearer(request);
          if (!accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const user = await verifyPiUser(accessToken);
          if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

          const body = (await request.json().catch(() => null)) as { adId?: string } | null;
          const adId = body?.adId?.trim();
          if (!adId || !SAFE_PI_ID_RE.test(adId)) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          if (!piApiKey()) {
            console.error("[pi-ad-reward] PI_API_KEY missing");
            return Response.json({ error: "Ads service unavailable" }, { status: 503 });
          }

          const status = await getPiAdStatus(adId);
          if (!status) {
            return Response.json({ error: "Ad verification failed" }, { status: 400 });
          }
          return Response.json({
            ok: true,
            verified: status.mediator_ack_status === "granted",
            status: status.mediator_ack_status,
          });
        } catch (err) {
          console.error("[pi-ad-reward] unexpected error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
