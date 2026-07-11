import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const ReportSchema = z.object({
  device_key: z.string().min(10).max(200),
  booking_id: z.string().uuid().nullable().optional(),
  impressions: z.number().int().min(0).max(1_000_000).default(1),
  kind: z.enum(["heartbeat", "play"]).default("play"),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/screen-playlist")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const key = url.searchParams.get("device_key");
        if (!key) return Response.json({ error: "missing device_key" }, { status: 400 });
        const { data, error } = await db.rpc("screen_playlist", { p_device_key: key });
        if (error) {
          if ((error.message ?? "").includes("screen_not_found"))
            return Response.json({ error: "Screen not registered" }, { status: 404 });
          return Response.json({ error: error.message }, { status: 400 });
        }
        return Response.json({ playlist: data ?? [] });
      },
      POST: async ({ request }) => {
        const raw = await request.json().catch(() => null);
        const parsed = ReportSchema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

        const { data: screen } = await db
          .from("screens")
          .select("id, location_id")
          .eq("device_key", parsed.data.device_key)
          .maybeSingle();
        if (!screen) return Response.json({ error: "Screen not registered" }, { status: 404 });

        await db.from("screen_reports").insert({
          screen_id: screen.id,
          booking_id: parsed.data.booking_id ?? null,
          kind: parsed.data.kind,
          impressions: parsed.data.impressions,
          meta: parsed.data.meta ?? {},
        });
        await db
          .from("screens")
          .update({ last_ping_at: new Date().toISOString(), status: "online", current_booking_id: parsed.data.booking_id ?? null })
          .eq("id", screen.id);

        // Play events also insert into plays (which triggers ledger append)
        if (parsed.data.kind === "play" && parsed.data.booking_id && screen.location_id) {
          await db.from("plays").insert({
            booking_id: parsed.data.booking_id,
            location_id: screen.location_id,
            played_at: new Date().toISOString(),
            impressions: parsed.data.impressions,
          });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
