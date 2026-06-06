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

export const Route = createFileRoute("/api/public/pi-balance")({
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
          const user = await verifyPiUser(accessToken);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const { data, error } = await supabaseAdmin
            .from("pi_balances")
            .select("balance")
            .eq("pi_uid", user.uid)
            .maybeSingle();
          if (error) {
            console.error("[pi-balance] read failed", error);
            return Response.json({ error: "Internal error" }, { status: 500 });
          }

          return Response.json({
            ok: true,
            balance: Number(data?.balance ?? 0),
            username: user.username,
          });
        } catch (err) {
          console.error("[pi-balance] unexpected error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
