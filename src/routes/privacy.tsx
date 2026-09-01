import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const URL = "https://billboard-bloom-ai.lovable.app/privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Pi Billboard" },
      {
        name: "description",
        content:
          "How Pi Billboard handles Pi Network identity, payment records and campaign data. No fiat, no custodial wallets, no data sales.",
      },
      { property: "og:title", content: "Privacy Policy — Pi Billboard" },
      {
        property: "og:description",
        content:
          "Pi identity, payment and campaign data practices for the Pi Billboard advertising network.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PrivacyPage,
});

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Data we receive from Pi Network",
    body: [
      "When you sign in with Pi we receive only what the scopes you approve allow: your Pi user id (uid) and username (username scope), the ability to create payments on your behalf (payments scope), and — if you connect your wallet — your public wallet address (wallet_address scope).",
      "We never receive or request your Pi passphrase, private seed, or recovery phrase. Nobody at Pi Billboard can move Pi out of your wallet: every transfer is initiated by you inside the Pi Browser and signed by you.",
    ],
  },
  {
    title: "2. Data we store",
    body: [
      "Advertiser records: campaigns, smart-contract terms, creative assets you generate or upload, bookings, invoices and delivery reports.",
      "Payment records: the Pi payment identifier, on-chain transaction id, amount in π and memo for each settlement, so invoices and the verifiable ledger can be audited.",
      "Partner records: company details, venue inventory, rate cards and payout wallet addresses supplied by billboard operators.",
    ],
  },
  {
    title: "3. What we do not do",
    body: [
      "We do not sell, rent or share your personal data with advertising data brokers.",
      "We do not hold fiat currency, we do not operate a custodial wallet, and we do not display simulated balances. All values are denominated in π.",
      "We do not track you across other websites and we do not run third-party advertising trackers on this app.",
    ],
  },
  {
    title: "4. Access tokens and verification",
    body: [
      "Your Pi access token is used only to prove who you are. Every request our backend receives is re-validated against the Pi Platform (GET /v2/me) before any data is returned, and payments are verified directly with the Pi Platform before the ledger is updated.",
    ],
  },
  {
    title: "5. Retention and deletion",
    body: [
      "Financial records (payments, invoices, ledger entries) are retained for audit integrity. Campaign content, creatives and partner profiles can be removed on request to the operator of this app; the corresponding ledger hashes remain, without personal content.",
    ],
  },
  {
    title: "6. Ads shown inside the app",
    body: [
      "Where the app displays Pi Ads Network placements, the ad is served by the Pi Browser and rewarded results are verified server-side with the Pi Ads Network before any benefit is granted. We receive an ad identifier and its acknowledgement status — no ad-profile data about you.",
    ],
  },
];

function PrivacyPage() {
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
          <ShieldCheck className="size-6 text-success" aria-hidden />
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Pi Billboard is a Pi Network application. It runs on Pi Mainnet and settles exclusively in
          π.
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
          Questions about this policy or a data request? Contact the app operator through the Pi
          Network App Portal listing for Pi Billboard. See also our{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
