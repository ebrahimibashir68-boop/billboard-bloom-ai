import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  location_id: z.string().uuid().nullable().optional(),
  orientation: z.enum(["landscape", "portrait", "square"]).default("landscape"),
  resolution: z.string().max(40).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export const Route = createFileRoute("/api/public/pi-screens")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { data: screens } = await db
          .from("screens")
          .select(
            "id, name, device_key, status, orientation, resolution, notes, location_id, last_ping_at, created_at, billboard_locations(name, city, country, image_url)",
          )
          .eq("pi_uid", user.uid)
          .order("created_at", { ascending: false });

        // Aggregate earnings from paid invoices attached to bookings on these screens' locations
        const locationIds = (screens ?? []).map((s: { location_id: string | null }) => s.location_id).filter(Boolean);
        let earnings = 0;
        let playCount = 0;
        if (locationIds.length) {
          const { data: paidBookings } = await db
            .from("bookings")
            .select("total_pi")
            .in("location_id", locationIds)
            .eq("status", "running");
          earnings = (paidBookings ?? []).reduce(
            (a: number, b: { total_pi: number }) => a + Number(b.total_pi ?? 0),
            0,
          );
          const { count } = await db
            .from("plays")
            .select("id", { count: "exact", head: true })
            .in("location_id", locationIds);
          playCount = count ?? 0;
        }
        return Response.json({ screens: screens ?? [], stats: { earnings_pi: earnings, plays: playCount } });
      },
      POST: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const raw = await request.json().catch(() => null);
        const parsed = CreateSchema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

        const { data, error } = await db
          .from("screens")
          .insert({
            name: parsed.data.name,
            pi_uid: user.uid,
            pi_username: user.username,
            location_id: parsed.data.location_id ?? null,
            orientation: parsed.data.orientation,
            resolution: parsed.data.resolution ?? null,
            notes: parsed.data.notes ?? null,
          })
          .select("id, device_key")
          .single();
        if (error || !data) {
          console.error("[pi-screens] insert", error);
          return Response.json({ error: "Insert failed" }, { status: 500 });
        }
        return Response.json({ ok: true, ...data });
      },
      DELETE: async ({ request }) => {
        const token = bearer(request);
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await verifyPiUser(token);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return Response.json({ error: "Invalid" }, { status: 400 });
        const { error } = await db.from("screens").delete().eq("id", id).eq("pi_uid", user.uid);
        if (error) return Response.json({ error: "Delete failed" }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
