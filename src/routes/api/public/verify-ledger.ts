import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export const Route = createFileRoute("/api/public/verify-ledger")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") ?? 50)));

        const { data: entries } = await db
          .from("ledger_entries")
          .select("seq, prev_hash, hash, kind, ref_table, ref_id, payload, pi_txid, created_at")
          .order("seq", { ascending: false })
          .limit(limit);

        const { data: verify } = await db.rpc("verify_ledger_integrity");
        const v = Array.isArray(verify) ? verify[0] : verify;

        return Response.json({
          entries: entries ?? [],
          integrity: v ?? { ok: false, checked: 0, first_bad_seq: null },
        });
      },
    },
  },
});
