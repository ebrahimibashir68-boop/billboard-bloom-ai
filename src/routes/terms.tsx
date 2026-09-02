import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";

const URL = "https://billboard-bloom-ai.lovable.app/terms";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Pi Billboard" },
      {
        name: "description",
        content:
          "Terms for advertisers, billboard partners and displayers using the Pi Billboard network. Pi Mainnet settlement, π-denominated pricing, no fiat.",
      },
      { property: "og:title", content: "Terms of Service — Pi Billboard" },
      {
        property: "og:description",
        content:
          "Rules for advertisers, partners and screen operators on the Pi-settled global billboard network.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermsPage,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. The service",
    body: [
      "Pi Billboard lets advertisers design, contract and schedule out-of-home advertising on digital billboards and live-venue screens, and lets billboard partners and screen operators list inventory, approve creatives and receive revenue.",
      "Access requires a Pi Network account and the Pi Browser. Signing in uses Pi authentication; no separate password is created.",
    ],
  },
  {
    title: "2. Payments in Pi",
    body: [
      "All prices, fees and payouts are denominated in π and settle on Pi Mainnet. There is no fiat currency, no simulated currency and no custodial balance under our control.",
      "Purchases use the Pi user-to-app flow: you create the payment in the Pi Browser, our server asks the Pi Platform to approve it, and the purchase is recorded only after the Pi Platform confirms completion with an on-chain transaction id.",
      "Partner revenue is paid out with the Pi app-to-user flow to the wallet address the partner supplies. Payout accuracy depends on that address being correct.",
    ],
  },
  {
    title: "3. Refunds and delivery",
    body: [
      "Completed Pi transactions are final on-chain and cannot be reversed by us. Where booked impressions are not delivered, the reconciliation process issues a credit note or a make-good placement against the affected campaign.",
      "Delivery figures come from proof-of-play records reported by screens and are recorded in the app's hash-chained ledger for independent verification.",
    ],
  },
  {
    title: "4. Advertiser responsibilities",
    body: [
      "You are responsible for holding the rights to the text, images and video you submit, and for the legality of your advertising in every market you target.",
      "Prohibited content includes anything unlawful, hateful, deceptive, sexually explicit, or that impersonates Pi Network, its Core Team or this app. Billboard partners may reject any creative for their own venues.",
    ],
  },
  {
    title: "5. Partner and displayer responsibilities",
    body: [
      "Partners warrant that they control the inventory they list and that stated impressions, resolutions and dwell figures are accurate.",
      "Screen operators must report plays honestly. Falsified proof-of-play records void the associated payouts.",
    ],
  },
  {
    title: "6. AI-generated output",
    body: [
      "Creative suggestions, venue matching and optimisation scores are produced by automated models and are provided for guidance. You remain responsible for reviewing any AI output before it runs on a public screen.",
    ],
  },
  {
    title: "7. Availability and liability",
    body: [
      "The service is provided on an as-is basis. We are not liable for indirect or consequential losses, and our aggregate liability is limited to the π amount you paid for the affected campaign.",
      "Pi Network is an independent platform; this app is not operated by the Pi Core Team.",
    ],
  },
];

function TermsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-3.5" />
          Back to Pi Billboard
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <ScrollText className="size-6 text-brand" aria-hidden />
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Applies to advertisers, billboard partners and screen operators using Pi Billboard.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-medium tracking-tight">{s.title}</h2>
              <div className="mt-2 space-y-2">
                {s.body.map((p) => (
                  <p key={p} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          See also our{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
