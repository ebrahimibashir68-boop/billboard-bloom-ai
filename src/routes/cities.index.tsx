import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Building2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { CITIES } from "@/lib/cities";

const URL = "https://billboard-bloom-ai.lovable.app/cities";
const DESC =
  "Browse digital billboard advertising by city — New York, London, Dubai, Tokyo, Paris and more. Hourly rates in Pi with on-chain proof-of-play.";

export const Route = createFileRoute("/cities/")({
  head: () => ({
    meta: [
      { title: "Billboard Advertising by City · Pi Billboard" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Billboard Advertising by City" },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://billboard-bloom-ai.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Cities", item: URL },
          ],
        }),
      },
    ],
  }),
  component: CitiesPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function CitiesPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("billboard_locations")
        .select("city")
        .eq("active", true);
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { city: string }[]) {
        map[row.city] = (map[row.city] ?? 0) + 1;
      }
      setCounts(map);
    })();
  }, []);

  return (
    <AppShell>
      <TopBar title="Cities" titleAs="h2" />
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Billboard advertising by city</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{DESC}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITIES.map((c) => (
            <Link
              key={c.slug}
              to="/cities/$city"
              params={{ city: c.slug }}
              className="block bg-surface border border-border rounded-2xl p-5 hover:border-brand transition-colors"
            >
              <p className="font-semibold flex items-center gap-2">
                <MapPin className="size-4 text-brand" /> {c.city}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{c.country}</p>
              <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{c.blurb}</p>
              <p className="text-[11px] text-brand mt-3 flex items-center gap-1">
                <Building2 className="size-3" />
                {counts[c.city] ?? 0} screen{(counts[c.city] ?? 0) === 1 ? "" : "s"} available
              </p>
            </Link>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Prefer to browse every screen at once? See the{" "}
          <Link to="/locations" className="text-brand underline">
            full global billboard inventory
          </Link>{" "}
          or read the{" "}
          <Link to="/guide/stadium-advertising-costs" className="text-brand underline">
            stadium advertising cost guide
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
