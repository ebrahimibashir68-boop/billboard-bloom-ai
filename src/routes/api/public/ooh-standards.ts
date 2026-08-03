import { createFileRoute } from "@tanstack/react-router";

// Public reference endpoint: the OpenOOH venue taxonomy plus the daypart
// definitions the network trades on. No PII, safe for anonymous callers.
export const Route = createFileRoute("/api/public/ooh-standards")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [{ data: types }, { data: metrics }] = await Promise.all([
          supabaseAdmin
            .from("openooh_venue_types")
            .select("id, parent_id, level, name, full_path")
            .order("id", { ascending: true }),
          supabaseAdmin
            .from("venue_audience_metrics")
            .select("daypart, impression_multiplier, avg_audience")
            .limit(2000),
        ]);

        const byDaypart = new Map<string, { multiplier: number; audience: number; n: number }>();
        for (const m of metrics ?? []) {
          const cur = byDaypart.get(m.daypart) ?? { multiplier: 0, audience: 0, n: 0 };
          cur.multiplier += Number(m.impression_multiplier ?? 0);
          cur.audience += Number(m.avg_audience ?? 0);
          cur.n += 1;
          byDaypart.set(m.daypart, cur);
        }

        return Response.json({
          taxonomy: types ?? [],
          dayparts: [...byDaypart.entries()].map(([daypart, v]) => ({
            daypart,
            avg_multiplier: v.n ? Math.round((v.multiplier / v.n) * 100) / 100 : 0,
            total_audience: v.audience,
            faces_measured: v.n,
          })),
        });
      },
    },
  },
});
