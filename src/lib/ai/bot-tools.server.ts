import { tool } from "ai";
import { z } from "zod";
import {
  DAYPARTS,
  DEFAULT_AGENCY_COMMISSION_PCT,
  DEFAULT_REVENUE_SHARE_PCT,
  PAYMENT_TERMS,
  PLATFORM_FEE_PCT,
  cpmCost,
  dueDate,
  estimateImpressions,
  impressionsForBudget,
  invoiceBalance,
  netFromGross,
  platformFee,
  revenueShare,
  shortfallCredit,
} from "@/lib/ooh/standards";
import { BASE_PI_PER_DAY, PLACEMENTS, computeCost } from "@/lib/pi/pricing";
import { SERVICES } from "@/lib/ai/concierge-tools.server";

/* ------------------------------------------------------------------ */
/* RoboPay — Pi settlement, billing and payout tools                   */
/* ------------------------------------------------------------------ */

export const roboPayTools = {
  pi_settlement_overview: tool({
    description:
      "Explain how money moves in this app: Pi deposits (U2A), campaign purchase from balance, platform fee, media-owner revenue share and Pi payouts (A2U). Use before any money question.",
    inputSchema: z.object({}),
    execute: async () => ({
      deposit: {
        flow: "User-to-App (U2A)",
        how: "The user approves a Pi payment in the Pi Browser wallet; the app verifies and completes it server-side, then credits the in-app Pi balance.",
        route: "/bookings",
      },
      spend: {
        how: "Campaigns, bookings and smart contracts are settled by deducting Pi from the in-app balance, atomically, only after the user confirms.",
        routes: ["/campaigns", "/contracts", "/marketplace"],
      },
      fees: { platformFeePct: PLATFORM_FEE_PCT, agencyCommissionPct: DEFAULT_AGENCY_COMMISSION_PCT },
      payout: {
        flow: "App-to-User (A2U)",
        revenueSharePct: DEFAULT_REVENUE_SHARE_PCT,
        how: "Media owners and screen displayers withdraw their share of delivered spend as Pi.",
        route: "/payouts",
      },
      paymentTerms: PAYMENT_TERMS,
    }),
  }),

  quote_campaign: tool({
    description:
      "Produce a full Pi quote for a campaign: gross, platform fee, agency commission and net, using either the venue-tier model or the CPM model.",
    inputSchema: z.object({
      placement: z.enum(["stadium", "arena", "racetrack", "esports"]).nullable(),
      days: z.number().nullable(),
      dailyImpressions: z.number().nullable(),
      cpmPi: z.number().nullable(),
      agencyCommissionPct: z.number().nullable(),
    }),
    execute: async ({ placement, days, dailyImpressions, cpmPi, agencyCommissionPct }) => {
      const commission = agencyCommissionPct ?? DEFAULT_AGENCY_COMMISSION_PCT;
      let grossPi = 0;
      let basis = "";
      let impressions: number | null = null;

      if (dailyImpressions && cpmPi && days && days > 0) {
        impressions = estimateImpressions({ dailyImpressions, hours: days * 24 });
        grossPi = cpmCost(impressions, cpmPi);
        basis = "CPM model";
      } else if (placement && days && days > 0) {
        grossPi = computeCost(placement, days);
        basis = `Venue-tier model (base ${BASE_PI_PER_DAY} Pi/day)`;
      } else {
        return { error: "Need placement+days, or dailyImpressions+cpmPi+days." };
      }

      const fee = platformFee(grossPi);
      return {
        basis,
        impressions,
        grossPi,
        platformFeePct: PLATFORM_FEE_PCT,
        platformFeePi: fee,
        totalPayablePi: Math.round((grossPi + fee) * 10000) / 10000,
        agencyCommissionPct: commission,
        netToMediaOwnerPi: netFromGross(grossPi, commission),
        tiers: PLACEMENTS,
        nextStep: "/campaigns",
      };
    },
  }),

  budget_reach: tool({
    description: "Given a Pi budget and a CPM in Pi, work out how many impressions that budget buys.",
    inputSchema: z.object({ budgetPi: z.number(), cpmPi: z.number() }),
    execute: async ({ budgetPi, cpmPi }) => ({
      budgetPi,
      cpmPi,
      impressions: impressionsForBudget(budgetPi, cpmPi),
    }),
  }),

  invoice_math: tool({
    description:
      "Compute an invoice: subtotal, platform fee, credit notes for under-delivery, amount paid, remaining balance and the due date from the payment terms.",
    inputSchema: z.object({
      subtotalPi: z.number(),
      paidPi: z.number().nullable(),
      creditsPi: z.number().nullable(),
      terms: z.string().nullable().describe("Payment terms id, e.g. net_30"),
      issuedAt: z.string().nullable().describe("ISO date the invoice was issued"),
    }),
    execute: async ({ subtotalPi, paidPi, creditsPi, terms, issuedAt }) => {
      const t = terms ?? "net_30";
      const issued = issuedAt ?? new Date().toISOString();
      const feePi = platformFee(subtotalPi);
      const totalPi = Math.round((subtotalPi + feePi) * 10000) / 10000;
      const credited = (creditsPi ?? 0) + (paidPi ?? 0);
      return {
        subtotalPi,
        platformFeePi: feePi,
        totalPi,
        creditsPi: creditsPi ?? 0,
        paidPi: paidPi ?? 0,
        balancePi: invoiceBalance({ totalPi, creditedTotalPi: credited }),
        terms: t,
        dueDate: dueDate(issued, t).toISOString().slice(0, 10),
        nextStep: "/bookings",
      };
    },

  }),

  payout_estimate: tool({
    description:
      "Estimate a media owner's or displayer's Pi payout from delivered gross spend, and explain the A2U withdrawal.",
    inputSchema: z.object({
      grossPi: z.number(),
      sharePct: z.number().nullable(),
    }),
    execute: async ({ grossPi, sharePct }) => {
      const share = sharePct ?? DEFAULT_REVENUE_SHARE_PCT;
      return {
        grossPi,
        sharePct: share,
        payoutPi: revenueShare(grossPi, share),
        settledIn: "Pi (App-to-User)",
        nextStep: "/payouts",
      };
    },
  }),

  make_good_check: tool({
    description:
      "Check booked vs delivered impressions for under-delivery and compute the Pi credit note owed to the advertiser.",
    inputSchema: z.object({
      bookedImpressions: z.number(),
      deliveredImpressions: z.number(),
      spendPi: z.number(),
    }),
    execute: async ({ bookedImpressions, deliveredImpressions, spendPi }) => ({
      bookedImpressions,
      deliveredImpressions,
      discrepancyPct: discrepancyPct(bookedImpressions, deliveredImpressions),
      needsMakeGood: needsMakeGood(bookedImpressions, deliveredImpressions),
      creditNotePi: shortfallCredit({
        booked: bookedImpressions,
        delivered: deliveredImpressions,
        spendPi,
      }),
      nextStep: "/measurement",
    }),

  }),
};

/* ------------------------------------------------------------------ */
/* OpenMind — strategy, planning and service orchestration tools       */
/* ------------------------------------------------------------------ */

export const openMindTools = {
  plan_campaign_roadmap: tool({
    description:
      "Build a step-by-step roadmap through this app for a user's objective, naming the exact screens to use in order. Use for anyone who does not know where to start.",
    inputSchema: z.object({
      objective: z.string().describe("What the user wants to achieve, in their own words."),
      role: z.enum(["advertiser", "agency", "media_owner", "displayer", "unsure"]),
      budgetPi: z.number().nullable(),
    }),
    execute: async ({ objective, role, budgetPi }) => {
      const buy = [
        { step: 1, do: "Describe the goal and audience; get a structured creative brief", route: "/studio-design" },
        { step: 2, do: "Shortlist screens by city, venue type and impressions", route: "/marketplace" },
        { step: 3, do: "Post a brief if you want media owners to bid", route: "/rfps" },
        { step: 4, do: "Lock the deal as a hash-verified smart contract", route: "/contracts" },
        { step: 5, do: "Fund the balance in Pi and launch the campaign", route: "/campaigns" },
        { step: 6, do: "Watch delivered impressions, eCPM and make-goods", route: "/measurement" },
      ];
      const sell = [
        { step: 1, do: "Register the company and its venues, set rate cards", route: "/partner" },
        { step: 2, do: "Register physical screens and pull playlists", route: "/displayer" },
        { step: 3, do: "Approve incoming advertiser creative", route: "/partner" },
        { step: 4, do: "Verify proof-of-play on the on-chain ledger", route: "/ledger" },
        { step: 5, do: "Withdraw the revenue share as Pi", route: "/payouts" },
      ];
      return {
        objective,
        role,
        budgetPi,
        roadmap: role === "media_owner" || role === "displayer" ? sell : buy,
        note: "Every step that spends Pi is confirmed by the user on the page.",
      };
    },
  }),

  recommend_services: tool({
    description:
      "Pick the handful of app services that actually match a described need, with why each one is relevant.",
    inputSchema: z.object({ need: z.string() }),
    execute: async ({ need }) => ({ need, catalogue: SERVICES }),
  }),

  daypart_strategy: tool({
    description:
      "Recommend which dayparts to buy for an objective, with the price multiplier that applies to each.",
    inputSchema: z.object({ objective: z.string() }),
    execute: async ({ objective }) => ({
      objective,
      dayparts: DAYPARTS,
      guidance:
        "Live-event windows deliver the densest attention but cost the most; morning and midday are the cheapest way to build frequency.",
    }),
  }),

  innovation_ideas: tool({
    description:
      "Propose concrete, app-specific ways the user could use emerging DOOH, blockchain and AI capabilities available here.",
    inputSchema: z.object({ context: z.string() }),
    execute: async ({ context }) => ({
      context,
      capabilities: [
        "AI creative generation and scoring (/studio-design, /optimize)",
        "Hash-chained proof-of-play verification (/ledger)",
        "CPM trading with automatic make-good credits (/measurement)",
        "Smart contracts settled natively in Pi (/contracts)",
        "Programmatic RFP bidding with media owners (/rfps)",
        "A2U Pi revenue share to venue owners (/payouts)",
      ],
    }),
  }),
};
