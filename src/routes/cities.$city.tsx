import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Monitor, Zap, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, getCity } from "@/lib/cities";

interface LocationRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  size_meters: string | null;
  resolution: string | null;
  daily_impressions: number;
  hourly_pi_rate: number;
  image_url: string | null;
  is_programmatic: boolean;
}

export const Route = createFileRoute("/cities/$city")({
  loader: ({ params }) => {
    const city = getCity(params.city);
    if (!city) throw notFound();
    return { city };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "City not found · Pi Billboard" }, { name: "robots", content: "noindex" }] };
    }
    const { city, country, blurb } = loaderData.city;
    const url = `https://billboard-bloom-ai.lovable.app/cities/${params.city}`;
    const title = `Billboard Advertising in ${city} · Pi Billboard`;
    const description = `Book digital billboards in ${city}, ${country} by the hour and pay in Pi. ${blurb}`.slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Digital billboard advertising in ${city}`,
            serviceType: "Out-of-home advertising",
            description,
            url,
            areaServed: { "@type": "City", name: city, address: { "@type": "PostalAddress", addressCountry: country } },
            provider: { "@type": "Organization", name: "Pi Billboard", url: "https://billboard-bloom-ai.lovable.app/" },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://billboard-bloom-ai.lovable.app/" },
              { "@type": "ListItem", position: 2, name: "Cities", item: "https://billboard-bloom-ai.lovable.app/cities" },
              { "@type": "ListItem", position: 3, name: city, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: CityPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => (
    <div className="p-8 space-y-3">
      <h1 className="text-xl font-bold">City not found</h1>
      <Link to="/cities" className="text-brand underline">
        Browse all cities
      </Link>
    </div>
  ),
});

function CityPage() {
  const { city } = Route.useLoaderData();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("billboard_locations")
        .select(
          "id, slug, name, city, country, size_meters, resolution, daily_impressions, hourly_pi_rate, image_url, is_programmatic",
        )
        .eq("active", true)
        .eq("city", city.city)
        .order("daily_impressions", { ascending: false });
      setRows((data ?? []) as LocationRow[]);
      setLoading(false);
    })();
  }, [city.city]);

  const impressions = rows.reduce((s, r) => s + r.daily_impressions, 0);
  const cheapest = rows.length ? Math.min(...rows.map((r) => r.hourly_pi_rate)) : 0;
  const others = CITIES.filter((c) => c.slug !== city.slug).slice(0, 6);

  return (
    <AppShell>
      <TopBar title={`${city.city} billboards`} titleAs="h2" />
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link to="/cities" className="hover:text-foreground underline">
            Cities
          </Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">{city.city}</span>
        </nav>

        <header className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold">
            Billboard advertising in {city.city}, {city.country}
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">{city.blurb}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
            <Stat label="Screens" value={String(rows.length)} icon={Monitor} />
            <Stat label="Daily impressions" value={`${(impressions / 1000).toFixed(0)}k`} icon={Users} />
            <Stat label="From" value={cheapest ? `${cheapest} π/hr` : "—"} icon={Zap} />
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Available screens in {city.city}</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No live screens in {city.city} right now — see the{" "}
              <Link to="/locations" className="text-brand underline">
                global inventory
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((l) => (
                <Link
                  key={l.id}
                  to="/locations/$slug"
                  params={{ slug: l.slug }}
                  className="block bg-surface border border-border rounded-2xl overflow-hidden hover:border-brand transition-colors"
                >
                  {l.image_url && (
                    <img
                      src={l.image_url}
                      alt={`${l.name} digital billboard in ${l.city}, ${l.country}`}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-4 space-y-2">
                    <p className="font-semibold text-sm leading-tight">{l.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Monitor className="size-3" /> {l.size_meters ?? "—"} · {l.resolution ?? "—"}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[11px] text-muted-foreground">
                        {(l.daily_impressions / 1000).toFixed(0)}k/day
                      </span>
                      <span className="text-sm font-bold text-brand">{l.hourly_pi_rate} π/hr</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Landmarks &amp; districts we cover</h2>
          <ul className="flex flex-wrap gap-2">
            {city.landmarks.map((l: string) => (
              <li key={l} className="text-xs px-2.5 py-1 rounded-full bg-surface border border-border">
                {l}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">How booking works in {city.city}</h2>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5 max-w-3xl">
            <li>
              Create your creative in the{" "}
              <Link to="/studio-design" className="text-brand underline">
                Design Studio
              </Link>{" "}
              or generate it with{" "}
              <Link to="/studio" className="text-brand underline">
                AI Creative
              </Link>
              .
            </li>
            <li>Pick a {city.city} screen above, choose your start time and number of hours.</li>
            <li>Pay in π — programmatic screens auto-approve, partner screens are reviewed.</li>
            <li>
              Track plays and spend in{" "}
              <Link to="/analytics" className="text-brand underline">
                Analytics
              </Link>{" "}
              with on-chain{" "}
              <Link to="/ledger" className="text-brand underline">
                proof-of-play
              </Link>
              .
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Other cities on the network</h2>
          <ul className="flex flex-wrap gap-2">
            {others.map((c) => (
              <li key={c.slug}>
                <Link
                  to="/cities/$city"
                  params={{ city: c.slug }}
                  className="text-xs px-2.5 py-1 rounded-full bg-surface border border-border hover:border-brand transition-colors inline-block"
                >
                  {c.city}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="p-3 bg-surface border border-border rounded-xl">
      <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
        <Icon className="size-3" /> {label}
      </p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}
