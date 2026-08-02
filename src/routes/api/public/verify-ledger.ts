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
          .select("seq, prev_hash, hash, kind, created_at")
          .order("seq", { ascending: false })
          .limit(limit);

        const { data: verify } = await db.rpc("verify_ledger_integrity");
        const v = Array.isArray(verify) ? verify[0] : verify;

        // Only non-identifying hash-chain metadata is public. Payloads,
        // pi_txid and ref ids stay server-side.
        return Response.json({
          entries: (entries ?? []).map((e: Record<string, unknown>) => ({
            ...e,
            ref_table: null,
            ref_id: null,
            payload: {},
            pi_txid: null,
          })),
          integrity: v ?? { ok: false, checked: 0, first_bad_seq: null },
        });
      },
    },
  },
});
