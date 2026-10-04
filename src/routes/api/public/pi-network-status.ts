import { createFileRoute } from "@tanstack/react-router";
import { getPiNetworkStatus } from "@/lib/pi/platform.server";

// Public, read-only network status. No auth required: it exposes only the
// same data the Pi blockchain's root endpoint already publishes to anyone.
export const Route = createFileRoute("/api/public/pi-network-status")({
  server: {
    handlers: {
      GET: async () => {
        const status = await getPiNetworkStatus();
        return new Response(JSON.stringify(status), {
          status: status.reachable ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
        });
      },
    },
  },
});
