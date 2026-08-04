import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CITIES } from "@/lib/cities";
import { PLACEMENTS, computeCost } from "@/lib/pi/pricing";
import { OPENOOH_CATEGORIES, cpmCost, estimateImpressions } from "@/lib/ooh/standards";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/** Public, read-only capabilities the concierge agent can use on the user's behalf. */
export const SERVICES = [
  { route: "/", label: "Global Network", what: "Live world map of billboard inventory across sports and live venues." },
  { route: "/marketplace", label: "Marketplace", what: "Browse and shortlist bookable screens and packages." },
  { route: "/locations", label: "Billboards", what: "Every billboard with size, resolution, impressions and Pi rate." },
  { route: "/cities", label: "Cities", what: "City-level inventory landing pages." },
  { route: "/bookings", label: "Bookings", what: "Create and track bookings, insertion orders and invoices." },
  { route: "/rfps", label: "RFP Marketplace", what: "Post a brief; media owners reply with proposals." },
  { route: "/contracts", label: "Smart Contracts", what: "Hash-verified ad contracts settled in Pi." },
  { route: "/campaigns", label: "Campaigns", what: "Campaign list, spend and status." },
  { route: "/studio-design", label: "Design Studio", what: "AI design for image, text and video billboard creative." },
  { route: "/studio", label: "AI Creative", what: "Generate billboard creative from a prompt." },
  { route: "/optimize", label: "AI Optimizer", what: "Score and improve existing creative." },
  { route: "/partner", label: "Partner Console", what: "Media owners manage venues, rate cards and ad approvals." },
  { route: "/displayer", label: "Displayer Console", what: "Register physical screens and pull playlists." },
  { route: "/payouts", label: "Pi Payouts", what: "Media-owner revenue share withdrawn as Pi (A2U)." },
  { route: "/measurement", label: "Delivery & Impressions", what: "Booked vs delivered impressions, eCPM, make-goods." },
  { route: "/analytics", label: "Analytics", what: "Performance reporting." },
  { route: "/ledger", label: "On-chain Ledger", what: "Hash-chained proof-of-play and payment ledger." },
  { route: "/innovate", label: "Innovation Bot", what: "Product innovation feed and assistant." },
] as const;

export const conciergeTools = {
  list_services: tool({
    description:
      "List every service, console and page in the app with what each one does. Use this to explain the app to a user who does not know it.",
    inputSchema: z.object({}),
    execute: async () => ({ services: SERVICES }),
  }),

  open_page: tool({
    description:
      "Offer the user a button that takes them to a page of the app. Use after explaining what they will find there.",
    inputSchema: z.object({
      route: z.string().describe("App route path, e.g. /marketplace"),
      label: z.string().describe("Short button label, e.g. Open Marketplace"),
      reason: z.string().describe("One sentence on why this page is the next step."),
    }),
    execute: async ({ route, label, reason }) => ({ route, label, reason }),
  }),

  search_billboards: tool({
    description:
      "Search live billboard inventory by city, country or name. Returns rate, impressions and CPM so you can recommend venues.",
    inputSchema: z.object({
      query: z.string().nullable().describe("City, country or venue name. Null for a general sample."),
      limit: z.number().nullable().describe("How many results, 1-20. Null for 8."),
    }),
    execute: async ({ query, limit }) => {
      const take = Math.min(Math.max(limit ?? 8, 1), 20);
      let q = db
        .from("billboard_locations")
        .select("name, slug, city, country, daily_impressions, hourly_pi_rate, cpm_pi, resolution, size_meters")
        .eq("active", true)
        .order("daily_impressions", { ascending: false })
        .limit(take);
      if (query?.trim()) {
        const t = query.trim();
        q = q.or(`city.ilike.%${t}%,country.ilike.%${t}%,name.ilike.%${t}%`);
      }
      const { data, error } = await q;
      if (error) return { error: "Inventory lookup failed." };
      return { count: data?.length ?? 0, billboards: data ?? [] };
    },
  }),

  city_inventory: tool({
    description: "List the key cities with landing pages and how many active billboards each has.",
    inputSchema: z.object({}),
    execute: async () => {
      const out: { city: string; country: string; slug: string; screens: number }[] = [];
      for (const c of CITIES) {
        const { count } = await db
          .from("billboard_locations")
          .select("id", { count: "exact", head: true })
          .eq("active", true)
          .ilike("city", c.city);
        out.push({ city: c.city, country: c.country, slug: c.slug, screens: count ?? 0 });
      }
      return { cities: out };
    },
  }),

  estimate_cost: tool({
    description:
      "Estimate campaign cost in Pi. Use placement+days for the simple venue-tier model, or impressions+cpm for the CPM model.",
    inputSchema: z.object({
      placement: z.enum(["stadium", "arena", "racetrack", "esports"]).nullable(),
      days: z.number().nullable(),
      dailyImpressions: z.number().nullable(),
      cpmPi: z.number().nullable(),
    }),
    execute: async ({ placement, days, dailyImpressions, cpmPi }) => {
      const result: Record<string, unknown> = {};
      if (placement && days && days > 0) {
        result.tierModel = {
          placement,
          days,
          totalPi: computeCost(placement, days),
          multiplier: PLACEMENTS.find((p) => p.id === placement)?.multiplier,
        };
      }
      if (dailyImpressions && cpmPi && days) {
        const impressions = estimateImpressions({ dailyImpressions, hours: days * 24 });
        result.cpmModel = { impressions, cpmPi, totalPi: cpmCost(impressions, cpmPi) };
      }
      if (!Object.keys(result).length) {
        return { error: "Need either placement+days, or dailyImpressions+cpmPi+days." };
      }
      return result;
    },
  }),

  venue_taxonomy: tool({
    description: "Return the OpenOOH venue taxonomy categories used to classify screens.",
    inputSchema: z.object({}),
    execute: async () => ({ categories: OPENOOH_CATEGORIES }),
  }),

  draft_creative_brief: tool({
    description:
      "Turn a rough idea from a user who does not know advertising into a structured billboard creative brief they can hand to the Design Studio.",
    inputSchema: z.object({
      idea: z.string(),
      audience: z.string().nullable(),
      goal: z.string().nullable(),
    }),
    execute: async ({ idea, audience, goal }) => ({
      brief: {
        idea,
        audience: audience ?? "Broad live-venue audience",
        goal: goal ?? "Awareness",
        guidance: [
          "Max 7 words of headline copy — billboards are read in under 3 seconds.",
          "One focal subject, high contrast, brand mark bottom-right.",
          "Design for the screen's native resolution and orientation.",
          "Include a short, memorable call to action (a domain or a Pi handle).",
        ],
        nextStep: "/studio-design",
      },
    }),
  }),
};
