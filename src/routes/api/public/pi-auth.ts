import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ accessToken: z.string().min(10).max(4096) });

export const Route = createFileRoute("/api/public/pi-auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = Body.safeParse(payload);
        if (!parsed.success) {
          return new Response("Invalid input", { status: 400 });
        }

        // Validate the access token directly with the Pi Platform.
        const meRes = await fetch("https://api.minepi.com/v2/me", {
          headers: { Authorization: `Bearer ${parsed.data.accessToken}` },
        });
        if (!meRes.ok) {
          return new Response("Invalid Pi access token", { status: 401 });
        }
        const me = (await meRes.json()) as {
          uid?: string;
          username?: string;
          credentials?: { scopes?: string[] };
        };
        if (!me?.uid || !me?.username) {
          return new Response("Malformed Pi profile", { status: 401 });
        }

        return Response.json({
          ok: true,
          user: { uid: me.uid, username: me.username },
          scopes: me.credentials?.scopes ?? [],
        });
      },
    },
  },
});
