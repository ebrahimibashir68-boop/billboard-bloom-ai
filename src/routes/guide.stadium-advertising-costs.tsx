import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft, DollarSign, TrendingUp, Globe, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/guide/stadium-advertising-costs")({
  head: () => ({
    meta: [
      { title: "Stadium Advertising Costs Guide — Pi Billboard" },
      {
        name: "description",
        content:
          "Compare traditional stadium advertising costs with Pi Billboard's dynamic, AI-powered digital placements. Learn how much stadium advertising costs and why digital is more cost-efficient.",
      },
      {
        property: "og:title",
        content: "Stadium Advertising Costs Guide — Pi Billboard",
      },
      {
        property: "og:description",
        content:
          "Compare traditional sports venue sponsorship rates with dynamic, Pi-denominated digital billboard pricing.",
      },
      {
        property: "og:url",
        content:
          "https://billboard-bloom-ai.lovable.app/guide/stadium-advertising-costs",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://billboard-bloom-ai.lovable.app/guide/stadium-advertising-costs",
      },
    ],
  }),
  component: StadiumAdvertisingCostsGuide,
});

function StadiumAdvertisingCostsGuide() {
  return (
    <AppShell>
      <TopBar
        title="Advertising Guide"
        status={{ label: "1,402 Active Venues" }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition mb-6"
          >
            <ArrowLeft className="size-3" />
            Back to Network
          </Link>

          <h1 className="text-2xl font-bold mb-2">
            How Much Does Stadium Advertising Cost?
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            A comprehensive comparison of traditional sports venue sponsorship
            rates versus the Pi Billboard network&apos;s dynamic, Pi-denominated
            pricing model.
          </p>

          <div className="space-y-6">
            <section className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="size-4 text-brand" />
                <h2 className="text-lg font-semibold">
                  Traditional Stadium Advertising Costs
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Physical signage at major stadiums commands premium pricing due
                to limited inventory, production costs, and long-term contracts.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between border-b border-border pb-2">
                  <span>LED Billboard (per game)</span>
                  <span className="font-medium">$15,000 – $100,000+</span>
                </li>
                <li className="flex justify-between border-b border-border pb-2">
                  <span>Static Banner (season)</span>
                  <span className="font-medium">$5,000 – $50,000</span>
                </li>
                <li className="flex justify-between border-b border-border pb-2">
                  <span>Naming Rights (annual)</span>
                  <span className="font-medium">$1M – $30M+</span>
                </li>
                <li className="flex justify-between">
                  <span>Production & Installation</span>
                  <span className="font-medium">$2,000 – $25,000</span>
                </li>
              </ul>
            </section>

            <section className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="size-4 text-brand" />
                <h2 className="text-lg font-semibold">
                  Pi Billboard Digital Network
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI-generated digital placements that can be deployed across
                multiple venues simultaneously, with real-time pricing based on
                audience size and event importance.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between border-b border-border pb-2">
                  <span>Per-minute rate (small venue)</span>
                  <span className="font-medium">~6.8k π/min</span>
                </li>
                <li className="flex justify-between border-b border-border pb-2">
                  <span>Per-minute rate (premier venue)</span>
                  <span className="font-medium">~21.0k π/min</span>
                </li>
                <li className="flex justify-between border-b border-border pb-2">
                  <span>AI Creative Generation</span>
                  <span className="font-medium">12 π</span>
                </li>
                <li className="flex justify-between">
                  <span>Global multi-venue campaigns</span>
                  <span className="font-medium">Pay per minute, anywhere</span>
                </li>
              </ul>
            </section>

            <section className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-4 text-brand" />
                <h2 className="text-lg font-semibold">
                  Why Digital Is More Cost-Efficient
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h3 className="font-medium">No Production Delays</h3>
                  <p className="text-muted-foreground">
                    AI generates creatives in seconds. No printing, shipping, or
                    physical installation required.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Dynamic Pricing</h3>
                  <p className="text-muted-foreground">
                    Pay for exactly the minutes you need during peak audience
                    moments, not flat seasonal rates.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Instant Global Reach</h3>
                  <p className="text-muted-foreground">
                    Deploy one campaign across 1,400+ venues simultaneously
                    instead of negotiating with each stadium individually.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Real-Time Analytics</h3>
                  <p className="text-muted-foreground">
                    Track impressions, burn rates, and ROI live — something
                    impossible with static physical signage.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="size-4 text-brand" />
                <h2 className="text-lg font-semibold">
                  Ready to Advertise?
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Join thousands of advertisers using Pi Billboard to reach live
                audiences at a fraction of traditional stadium advertising costs.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/studio"
                  className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:brightness-110 transition"
                >
                  <Zap className="size-4 mr-2" />
                  Create Your Ad
                </Link>
                <Link
                  to="/campaigns"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-elevated transition"
                >
                  View Campaigns
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
