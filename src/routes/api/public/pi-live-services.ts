import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearer, verifyPiUser } from "@/lib/pi/auth-helper.server";
import { EXCLUSIVITY, RIGHTS_PACKAGES, SPONSOR_PROPERTIES, TRANSIT_FORMATS, sponsorshipQuote, transitQuote } from "@/lib/ooh/live-services";

// Sponsorships, transit / street furniture and live screen-time auctions.
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const short = z.string().trim().min(1).max(120);
const notes = z.string().trim().max(1000).optional();
const ids = (a: readonly { id: string }[]) => z.enum(a.map((x) => x.id) as [string, ...string[]]);

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("sponsorship"),
    property_type: ids(SPONSOR_PROPERTIES),
    property_name: short,
    rights_package: ids(RIGHTS_PACKAGES),
    exclusivity: ids(EXCLUSIVITY),
    term_start: date,
    years: z.number().min(1).max(10),
    notes,
  }),
  z.object({
    action: z.literal("transit"),
    format: ids(TRANSIT_FORMATS),
    city: short,
    route_or_site: short,
    units: z.number().int().min(1).max(5000),
    weeks: z.number().int().min(1).max(104),
    start_date: date,
    notes,
  }),
  z.object({
    action: z.literal("create_auction"),
    venue_name: short,
    event_name: short,
    slot_label: short,
    slot_seconds: z.number().int().min(5).max(600),
    est_impressions: z.number().int().min(0).max(1_000_000_000),
    reserve_pi: z.number().positive().max(1_000_000),
    min_increment_pi: z.number().positive().max(100_000),
    hours_open: z.number().min(1).max(336),
  }),
  z.object({ action: z.literal("bid"), auction_id: z.string().uuid(), amount_pi: z.number().positive().max(10_000_000) }),
]);

const BID_ERRORS: Record<string, string> = {
  not_found: "Auction not found",
  auction_closed: "This auction has closed",
  own_auction: "You can't bid on your own auction",
  bid_too_low: "Bid is below the minimum",
};

async function auth(request: Request) {
  const token = bearer(request);
  return token ? verifyPiUser(token) : null;
}

export const Route = createFileRoute("/api/public/pi-live-services")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await auth(request);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const kind = new URL(request.url).searchParams.get("kind");
        if (kind === "sponsorships" || kind === "transit") {
          const table = kind === "sponsorships" ? "sponsorship_deals" : "transit_placements";
          const { data, error } = await supabaseAdmin
            .from(table as "sponsorship_deals")
            .select("*")
            .eq("advertiser_pi_uid", user.uid)
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) return Response.json({ error: "Internal error" }, { status: 500 });
          return Response.json({ items: data ?? [] });
        }
        if (kind === "auctions") {
          // Close anything past its end time before listing.
          await supabaseAdmin.from("live_auctions").update({ status: "closed" }).eq("status", "open").lt("ends_at", new Date().toISOString());
          const { data, error } = await supabaseAdmin
            .from("live_auctions")
            .select("id, seller_pi_uid, seller_pi_username, venue_name, event_name, slot_label, slot_seconds, est_impressions, reserve_pi, min_increment_pi, current_bid_pi, current_bidder_username, bid_count, ends_at, status")
            .order("ends_at", { ascending: true })
            .limit(100);
          if (error) return Response.json({ error: "Internal error" }, { status: 500 });
          const items = (data ?? []).map(({ seller_pi_uid, ...a }) => ({ ...a, mine: seller_pi_uid === user.uid, leading: a.current_bidder_username === user.username }));
          return Response.json({ items });
        }
        return Response.json({ error: "Invalid kind" }, { status: 400 });
      },

      POST: async ({ request }) => {
        const user = await auth(request);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const d = parsed.data;
        try {
          if (d.action === "sponsorship") {
            const q = sponsorshipQuote({ property: d.property_type, pkg: d.rights_package, exclusivity: d.exclusivity, years: d.years });
            const end = new Date(d.term_start);
            end.setUTCDate(end.getUTCDate() + Math.round(d.years * 365));
            const { data, error } = await supabaseAdmin.from("sponsorship_deals").insert({
              advertiser_pi_uid: user.uid, advertiser_pi_username: user.username,
              property_type: d.property_type, property_name: d.property_name, rights_package: d.rights_package,
              exclusivity: d.exclusivity, term_start: d.term_start, term_end: end.toISOString().slice(0, 10),
              annual_fee_pi: q.annual, total_fee_pi: q.total, est_media_value_pi: q.mediaValue, notes: d.notes ?? null,
            }).select("id").single();
            if (error) throw error;
            return Response.json({ ok: true, id: data.id, quote: q });
          }
          if (d.action === "transit") {
            const q = transitQuote(d);
            const { data, error } = await supabaseAdmin.from("transit_placements").insert({
              advertiser_pi_uid: user.uid, advertiser_pi_username: user.username,
              format: d.format, city: d.city, route_or_site: d.route_or_site, units: d.units, weeks: d.weeks,
              unit_week_rate_pi: q.rate, total_pi: q.total, weekly_impressions: q.weeklyImpressions,
              start_date: d.start_date, notes: d.notes ?? null,
            }).select("id").single();
            if (error) throw error;
            return Response.json({ ok: true, id: data.id, quote: q });
          }
          if (d.action === "create_auction") {
            const { data, error } = await supabaseAdmin.from("live_auctions").insert({
              seller_pi_uid: user.uid, seller_pi_username: user.username,
              venue_name: d.venue_name, event_name: d.event_name, slot_label: d.slot_label,
              slot_seconds: d.slot_seconds, est_impressions: d.est_impressions,
              reserve_pi: d.reserve_pi, min_increment_pi: d.min_increment_pi,
              ends_at: new Date(Date.now() + d.hours_open * 3_600_000).toISOString(),
            }).select("id").single();
            if (error) throw error;
            return Response.json({ ok: true, id: data.id });
          }
          const { data, error } = await supabaseAdmin.rpc("place_auction_bid", {
            p_auction_id: d.auction_id, p_pi_uid: user.uid, p_pi_username: user.username, p_amount: d.amount_pi,
          });
          if (error) {
            const key = Object.keys(BID_ERRORS).find((k) => error.message.includes(k));
            if (key) return Response.json({ error: BID_ERRORS[key] }, { status: 400 });
            throw error;
          }
          return Response.json({ ok: true, ...(Array.isArray(data) ? data[0] : data) });
        } catch (err) {
          console.error("[pi-live-services] failed", d.action, err);
          return Response.json({ error: "Request failed" }, { status: 500 });
        }
      },
    },
  },
});
