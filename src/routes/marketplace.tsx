import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { MapPin, FileText, Building2, Sparkles, Palette, Radio, Blocks, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Global Marketplace · Pi Billboard" },
      { name: "description", content: "Discover billboards, partners, RFPs, and AI-ranked opportunities worldwide, powered by Pi and blockchain proof-of-play." },
      { property: "og:title", content: "Pi Billboard Marketplace" },
      { property: "og:description", content: "Book any famous billboard on the planet, pay in π, verify every play on-chain." },
    ],
  }),
  component: MarketplacePage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface LocationRow { id: string; slug: string; name: string; city: string; country: string; hourly_pi_rate: number; daily_impressions: number; image_url: string | null; is_programmatic: boolean; }
interface PartnerRow { id: string; company_name: string; country: string | null; billboards_summary: string | null; }
interface RfpRow { id: string; campaign_name: string; budget_pi: number; target_countries: string[] | null; status: string; }
interface Stats { locations: number; partners: number; plays: number; ledger: number; }

function MarketplacePage() {
  const [loc, setLoc] = useState<LocationRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [rfps, setRfps] = useState<RfpRow[]>([]);
  const [stats, setStats] = useState<Stats>({ locations: 0, partners: 0, plays: 0, ledger: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: locs }, { data: prs }, { count: locC }, { count: parC }, { count: playC }, { count: ledC }] = await Promise.all([
        supabase.from("billboard_locations").select("id, slug, name, city, country, hourly_pi_rate, daily_impressions, image_url, is_programmatic").eq("active", true).order("daily_impressions", { ascending: false }).limit(12),
        supabase.from("ad_partners").select("id, company_name, country, billboards_summary").eq("status", "approved").limit(12),
        supabase.from("billboard_locations").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("ad_partners").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("plays").select("id", { count: "exact", head: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("ledger_entries").select("seq", { count: "exact", head: true }),
      ]);
      setLoc((locs ?? []) as LocationRow[]);
      setPartners((prs ?? []) as PartnerRow[]);
      setStats({ locations: locC ?? 0, partners: parC ?? 0, plays: playC ?? 0, ledger: ledC ?? 0 });

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      // Public RFPs endpoint requires Pi bearer; skip if not signed in.
      if (token) {
        try {
          const res = await fetch("/api/public/pi-rfps");
          if (res.ok) {
            const j = (await res.json()) as { rfps?: RfpRow[] };
            setRfps(j.rfps?.slice(0, 6) ?? []);
          }
        } catch { /* ignore */ }
      }
    })();
  }, []);

  return (
    <AppShell>
      <TopBar title="Pi Billboard" />
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs text-brand font-mono uppercase tracking-widest">
            <Blocks className="size-3.5" /> AI · Blockchain · Pi Network
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">The global billboard marketplace</h1>
          <p className="text-muted-foreground max-w-2xl">
            One place for advertisers, ad providers, and screen operators to meet. AI matches campaigns to the right screens; every play is anchored to a public, tamper-evident on-chain ledger; every payment settles in π.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Live billboards" value={stats.locations} icon={<MapPin className="size-4" />} />
          <StatCard label="Verified partners" value={stats.partners} icon={<Building2 className="size-4" />} />
          <StatCard label="On-chain plays" value={stats.plays} icon={<Radio className="size-4" />} />
          <StatCard label="Ledger entries" value={stats.ledger} icon={<Blocks className="size-4" />} />
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <ActionCard to="/studio-design" title="Design an ad" desc="Text, image, or video creatives with AI." icon={<Palette className="size-5" />} />
          <ActionCard to="/locations" title="Book a billboard" desc="Times Square, Piccadilly, Burj Khalifa, and more." icon={<MapPin className="size-5" />} />
          <ActionCard to="/displayer" title="Operate a screen" desc="Register your billboard, earn π per play." icon={<Radio className="size-5" />} />
          <ActionCard to="/rfps" title="Open RFPs" desc="Publish briefs, receive AI-scored proposals." icon={<FileText className="size-5" />} />
          <ActionCard to="/partner" title="Become a partner" desc="Onboard your outdoor network." icon={<Building2 className="size-5" />} />
          <ActionCard to="/ledger" title="Verify the ledger" desc="Public hash-chain of every play & payment." icon={<Blocks className="size-5" />} />
        </section>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2"><TrendingUp className="size-5 text-brand" /> Top-impression billboards</h2>
            <Link to="/locations" className="text-sm text-brand hover:underline">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loc.map((l) => (
              <Link key={l.id} to="/locations/$slug" params={{ slug: l.slug }} className="group rounded-xl border border-border overflow-hidden bg-surface hover:border-brand transition">
                {l.image_url && <div className="aspect-video bg-surface-elevated overflow-hidden"><img src={l.image_url} alt={l.name} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" /></div>}
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{l.name}</div>
                    {l.is_programmatic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono">AUTO</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{l.city}, {l.country}</div>
                  <div className="flex justify-between text-xs pt-2 border-t border-border mt-2">
                    <span className="text-muted-foreground">{(l.daily_impressions / 1000).toFixed(0)}k/day</span>
                    <span className="font-mono text-brand">π {l.hourly_pi_rate}/hr</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Building2 className="size-5 text-brand" /> Advertising partners</h2>
            <div className="space-y-2">
              {partners.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border border-border bg-surface">
                  <div className="font-medium text-sm">{p.company_name}</div>
                  <div className="text-xs text-muted-foreground">{p.country ?? "Global"} · {p.billboards_summary?.slice(0, 80) ?? "Verified operator"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="size-5 text-brand" /> Open briefs (RFPs)</h2>
            {rfps.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed border-border">Sign in with Pi to browse open advertiser briefs.</div>
            ) : (
              <div className="space-y-2">
                {rfps.map((r) => (
                  <Link key={r.id} to="/rfps" className="block p-3 rounded-lg border border-border bg-surface hover:border-brand">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate">{r.campaign_name}</span>
                      <span className="font-mono text-brand">π {r.budget_pi}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{(r.target_countries ?? []).join(", ") || "Worldwide"} · {r.status}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1 font-mono">{value.toLocaleString()}</div>
    </div>
  );
}

function ActionCard({ to, title, desc, icon }: { to: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="p-5 rounded-xl border border-border bg-surface hover:border-brand hover:bg-surface-elevated transition group">
      <div className="size-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-brand-foreground transition">{icon}</div>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
    </Link>
  );
}
