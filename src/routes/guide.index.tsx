import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { PlayCircle, Wallet, Sparkles, MapPin, Coins, Gauge, ArrowRight } from "lucide-react";
import tutorialVideo from "@/assets/pi-billboard-tutorial.mp4.asset.json";

const CANON = "https://billboard-bloom-ai.lovable.app/guide";

export const Route = createFileRoute("/guide/")({
  head: () => ({
    meta: [
      { title: "Video Guide — How to Advertise with Pi Billboard" },
      {
        name: "description",
        content:
          "Watch the narrated video guide: sign in with Pi, generate an AI creative, choose global venues, pay in Pi and track proof-of-play.",
      },
      { property: "og:title", content: "Video Guide — How to Advertise with Pi Billboard" },
      {
        property: "og:description",
        content:
          "A 75-second narrated walkthrough of the five steps to launch a billboard campaign paid in Pi.",
      },
      { property: "og:type", content: "video.other" },
      { property: "og:url", content: CANON },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Video Guide — How to Advertise with Pi Billboard" },
      {
        name: "twitter:description",
        content:
          "A 75-second narrated walkthrough of the five steps to launch a billboard campaign paid in Pi.",
      },
    ],
    links: [{ rel: "canonical", href: CANON }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: "How to Advertise with Pi Billboard",
          description:
            "Narrated walkthrough: sign in with Pi, generate an AI creative, choose venues, pay in Pi and track proof-of-play.",
          uploadDate: "2026-09-07",
          duration: "PT1M15S",
          publisher: { "@type": "Organization", name: "Pi Billboard" },
        }),
      },
    ],
  }),
  component: GuideVideoPage,
});

const steps = [
  { icon: Wallet, title: "Sign in with Pi", body: "Open the app in the Pi Browser and verify your identity on Pi Mainnet — your wallet links in one tap.", to: "/" },
  { icon: Sparkles, title: "Create with AI", body: "Describe your ad in one sentence and the Creative Studio builds a venue-ready billboard design.", to: "/studio" },
  { icon: MapPin, title: "Choose venues", body: "Browse 1,400+ stadiums and live venues, filter by city and screen type, and see live π rates.", to: "/locations" },
  { icon: Coins, title: "Pay in Pi", body: "Confirm the campaign and settle in π — approved and completed on Pi Mainnet, then written to the ledger.", to: "/bookings" },
  { icon: Gauge, title: "Track proof", body: "Follow impressions, spend and proof-of-play, all verifiable on-chain.", to: "/measurement" },
];

function GuideVideoPage() {
  return (
    <AppShell>
      <TopBar title="Video Guide" titleAs="h2" />
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-4xl space-y-10">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
              <PlayCircle className="size-3.5 text-brand" /> Guide
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              How to advertise with Pi Billboard
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              A narrated 75-second walkthrough of the whole flow — from Pi sign-in to on-chain
              proof-of-play. Share it with your audience or download it for offline use.
            </p>
          </header>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_0_60px_-30px_var(--color-brand)]">
            <video
              className="aspect-video w-full bg-black"
              src={tutorialVideo.url}
              controls
              playsInline
              preload="metadata"
            >
              <track kind="captions" />
            </video>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <span className="text-xs text-muted-foreground">
                1080p · with narration · 1 min 15 sec
              </span>
              <a
                href={tutorialVideo.url}
                download="pi-billboard-tutorial.mp4"
                className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Download video
              </a>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">The five steps</h2>
            <ol className="grid gap-4 md:grid-cols-2">
              {steps.map(({ icon: Icon, title, body, to }, i) => (
                <li key={title} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-surface-elevated text-brand">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Step {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  <Link
                    to={to}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    Open <ArrowRight className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">More reading</h2>
            <Link
              to="/guide/stadium-advertising-costs"
              className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline"
            >
              Stadium advertising costs guide <ArrowRight className="size-3.5" />
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
