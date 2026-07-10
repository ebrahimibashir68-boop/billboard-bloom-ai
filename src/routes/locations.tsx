import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Monitor, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";

interface Location {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  size_meters: string | null;
  resolution: string | null;
  daily_impressions: number;
  hourly_pi_rate: number;
  slot_seconds: number;
  image_url: string | null;
  is_programmatic: boolean;
}

export const Route = createFileRoute("/locations")({
  head: () => ({
    meta: [
      { title: "Global Billboard Inventory · Pi Billboard" },
      {
        name: "description",
        content:
          "Book famous digital billboards worldwide — Times Square, Piccadilly, Shibuya, Burj Khalifa and more — paid in Pi.",
      },
    ],
  }),
  component: LocationsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("billboard_locations")
        .select(
          "id, slug, name, city, country, size_meters, resolution, daily_impressions, hourly_pi_rate, slot_seconds, image_url, is_programmatic",
        )
        .eq("active", true)
        .order("hourly_pi_rate", { ascending: false });
      setLocations((data ?? []) as Location[]);
      setLoading(false);
    })();
  }, []);

  const filtered = locations.filter(
    (l) =>
      !q ||
      `${l.name} ${l.city} ${l.country}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell>
      <TopBar title="Billboards" />
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Global billboard inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locations.length} live screens · pay in π · programmatic auto-approve or partner-reviewed
          </p>
        </header>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search city, country, or venue"
          className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-sm"
        />

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((l) => (
              <Link
                key={l.id}
                to="/locations/$slug"
                params={{ slug: l.slug }}
                className="block bg-surface border border-border rounded-2xl overflow-hidden hover:border-brand transition-colors"
              >
                {l.image_url && (
                  <img
                    src={l.image_url}
                    alt={l.name}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{l.name}</p>
                    {l.is_programmatic ? (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                        <Zap className="size-3" /> Auto
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                        Review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" /> {l.city}, {l.country}
                  </p>
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
      </div>
    </AppShell>
  );
}
