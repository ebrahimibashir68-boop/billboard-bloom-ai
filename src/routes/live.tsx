import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";
import { useI18n } from "@/lib/i18n";
import { fmtInt, fmtPi } from "@/lib/ooh/standards";
import { EXCLUSIVITY, RIGHTS_PACKAGES, SPONSOR_PROPERTIES, TRANSIT_FORMATS, sponsorshipQuote, transitQuote } from "@/lib/ooh/live-services";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Sponsorships, Transit & Live Auctions · Pi Billboard" },
      { name: "description", content: "Stadium naming rights, team and event sponsorships, bus shelter, metro and airport ads, and live screen-time auctions during matches — all in Pi." },
      { property: "og:title", content: "Sponsorships, Transit & Live Auctions on Pi Billboard" },
      { property: "og:description", content: "Sponsor venues and events, book street furniture and transit media, and bid on live match screen time in Pi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://billboard-bloom-ai.lovable.app/live" }],
  }),
  component: LivePage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Row = Record<string, any> & { id: string };
type Tab = "sponsorships" | "transit" | "auctions";
const today = () => new Date().toISOString().slice(0, 10);
const input = "w-full h-9 rounded-md border border-border bg-background px-3 text-sm";

function useApi() {
  const { authenticate } = usePi();
  return useCallback(
    async (method: "GET" | "POST", arg: string | object) => {
      const { accessToken } = await authenticate();
      const res = await fetch(method === "GET" ? `/api/public/pi-live-services?kind=${arg}` : "/api/public/pi-live-services", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: method === "POST" ? JSON.stringify(arg) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      return json;
    },
    [authenticate],
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function LivePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("sponsorships");
  const tabs: { id: Tab; label: string }[] = [
    { id: "sponsorships", label: t("Sponsorships") },
    { id: "transit", label: t("Transit & street") },
    { id: "auctions", label: t("Live auctions") },
  ];
  return (
    <AppShell>
      <TopBar title={t("Sponsorships, transit & live auctions")} />
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((x) => (
            <button key={x.id} onClick={() => setTab(x.id)} className={`px-4 h-9 rounded-md text-sm border ${tab === x.id ? "bg-brand text-brand-foreground border-brand" : "border-border bg-surface"}`}>
              {x.label}
            </button>
          ))}
        </div>
        {tab === "sponsorships" && <Sponsorships />}
        {tab === "transit" && <Transit />}
        {tab === "auctions" && <Auctions />}
      </div>
    </AppShell>
  );
}

function List({ items, render }: { items: Row[]; render: (r: Row) => React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">{t("Your requests")}</h2>
      {items.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
      {items.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-surface p-3 text-sm">{render(r)}</div>
      ))}
    </div>
  );
}

function Sponsorships() {
  const { t } = useI18n();
  const api = useApi();
  const [f, setF] = useState({ property_type: "stadium_naming", property_name: "", rights_package: "gold", exclusivity: "category", term_start: today(), years: 3, notes: "" });
  const [items, setItems] = useState<Row[]>([]);
  const load = useCallback(() => api("GET", "sponsorships").then((j) => setItems(j.items)).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const q = sponsorshipQuote({ property: f.property_type, pkg: f.rights_package, exclusivity: f.exclusivity, years: f.years });
  const submit = async () => {
    try {
      await api("POST", { action: "sponsorship", ...f, notes: f.notes || undefined });
      toast.success("Sponsorship proposal sent");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Naming rights, team kits, event titles, league partnerships, tours and perimeter LED packages.</p>
        <Field label="Property type"><select className={input} value={f.property_type} onChange={(e) => setF({ ...f, property_type: e.target.value })}>{SPONSOR_PROPERTIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
        <Field label="Stadium, team or event name"><input className={input} value={f.property_name} onChange={(e) => setF({ ...f, property_name: e.target.value })} /></Field>
        <Field label="Rights package"><select className={input} value={f.rights_package} onChange={(e) => setF({ ...f, rights_package: e.target.value })}>{RIGHTS_PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
        <Field label="Exclusivity"><select className={input} value={f.exclusivity} onChange={(e) => setF({ ...f, exclusivity: e.target.value })}>{EXCLUSIVITY.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><input type="date" className={input} value={f.term_start} onChange={(e) => setF({ ...f, term_start: e.target.value })} /></Field>
          <Field label="Years"><input type="number" min={1} max={10} className={input} value={f.years} onChange={(e) => setF({ ...f, years: Number(e.target.value) })} /></Field>
        </div>
        <div className="rounded-md bg-background p-3 text-xs space-y-1">
          <div>{t("Estimate")}: {fmtPi(q.annual)} / year · {fmtPi(q.total)} total</div>
          <div className="text-muted-foreground">Estimated media value {fmtPi(q.mediaValue)}</div>
        </div>
        <button disabled={!f.property_name} onClick={submit} className="w-full h-9 rounded-md bg-brand text-brand-foreground text-sm disabled:opacity-50">{t("Submit")}</button>
      </div>
      <List items={items} render={(r) => (<><div className="font-medium">{r.property_name} <span className="text-xs text-muted-foreground">· {r.status}</span></div><div className="text-xs text-muted-foreground">{r.rights_package} · {r.term_start} → {r.term_end} · {fmtPi(Number(r.total_fee_pi))}</div></>)} />
    </div>
  );
}

function Transit() {
  const { t } = useI18n();
  const api = useApi();
  const [f, setF] = useState({ format: "bus_shelter", city: "", route_or_site: "", units: 10, weeks: 4, start_date: today(), notes: "" });
  const [items, setItems] = useState<Row[]>([]);
  const load = useCallback(() => api("GET", "transit").then((j) => setItems(j.items)).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const q = transitQuote(f);
  const submit = async () => {
    try {
      await api("POST", { action: "transit", ...f, notes: f.notes || undefined });
      toast.success("Placement requested");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Bus shelters, bus wraps, metro, airports, kiosks, taxi tops and train cards.</p>
        <Field label="Format"><select className={input} value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })}>{TRANSIT_FORMATS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><input className={input} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          <Field label="Route, line or site"><input className={input} value={f.route_or_site} onChange={(e) => setF({ ...f, route_or_site: e.target.value })} /></Field>
          <Field label="Units"><input type="number" min={1} className={input} value={f.units} onChange={(e) => setF({ ...f, units: Number(e.target.value) })} /></Field>
          <Field label="Weeks"><input type="number" min={1} className={input} value={f.weeks} onChange={(e) => setF({ ...f, weeks: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Start"><input type="date" className={input} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
        <div className="rounded-md bg-background p-3 text-xs space-y-1">
          <div>{t("Estimate")}: {fmtPi(q.rate)} per unit/week · {fmtPi(q.total)} total</div>
          <div className="text-muted-foreground">{fmtInt(q.weeklyImpressions)} impressions per week</div>
        </div>
        <button disabled={!f.city || !f.route_or_site} onClick={submit} className="w-full h-9 rounded-md bg-brand text-brand-foreground text-sm disabled:opacity-50">{t("Submit")}</button>
      </div>
      <List items={items} render={(r) => (<><div className="font-medium">{r.city} · {r.route_or_site} <span className="text-xs text-muted-foreground">· {r.status}</span></div><div className="text-xs text-muted-foreground">{r.format} · {r.units} units × {r.weeks} wk · {fmtPi(Number(r.total_pi))}</div></>)} />
    </div>
  );
}

function Auctions() {
  const { t } = useI18n();
  const api = useApi();
  const [items, setItems] = useState<Row[]>([]);
  const [bids, setBids] = useState<Record<string, string>>({});
  const [f, setF] = useState({ venue_name: "", event_name: "", slot_label: "Half-time LED", slot_seconds: 30, est_impressions: 50000, reserve_pi: 10, min_increment_pi: 1, hours_open: 24 });
  const load = useCallback(() => api("GET", "auctions").then((j) => setItems(j.items)).catch(() => {}), [api]);
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);
  const bid = async (a: Row) => {
    try {
      await api("POST", { action: "bid", auction_id: a.id, amount_pi: Number(bids[a.id]) });
      toast.success("Bid placed and recorded on the ledger");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  const create = async () => {
    try {
      await api("POST", { action: "create_auction", ...f });
      toast.success("Auction opened");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="grid md:grid-cols-[2fr_1fr] gap-6">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{t("Open auctions")}</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No auctions yet. Venue owners can open one on the right.</p>}
        {items.map((a) => {
          const min = a.current_bid_pi == null ? Number(a.reserve_pi) : Number(a.current_bid_pi) + Number(a.min_increment_pi);
          const open = a.status === "open";
          return (
            <div key={a.id} className="rounded-lg border border-border bg-surface p-3 text-sm space-y-2">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-medium">{a.event_name} · {a.venue_name}</div>
                  <div className="text-xs text-muted-foreground">{a.slot_label} · {a.slot_seconds}s · ~{fmtInt(Number(a.est_impressions))} impressions</div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-semibold text-brand">{a.current_bid_pi == null ? `Reserve ${fmtPi(Number(a.reserve_pi))}` : fmtPi(Number(a.current_bid_pi))}</div>
                  <div className="text-muted-foreground">{a.bid_count} bids · {open ? `ends ${new Date(a.ends_at).toLocaleString()}` : "closed"}</div>
                  {a.leading && <div className="text-success">You're leading</div>}
                </div>
              </div>
              {open && !a.mine && (
                <div className="flex gap-2">
                  <input type="number" step="0.01" min={min} placeholder={`Min ${min}`} className={input} value={bids[a.id] ?? ""} onChange={(e) => setBids({ ...bids, [a.id]: e.target.value })} />
                  <button disabled={!bids[a.id] || Number(bids[a.id]) < min} onClick={() => bid(a)} className="px-4 h-9 rounded-md bg-brand text-brand-foreground text-sm disabled:opacity-50 shrink-0">{t("Place bid")}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3 h-fit">
        <h2 className="text-sm font-semibold">{t("Create auction")}</h2>
        <Field label="Venue"><input className={input} value={f.venue_name} onChange={(e) => setF({ ...f, venue_name: e.target.value })} /></Field>
        <Field label="Match or event"><input className={input} value={f.event_name} onChange={(e) => setF({ ...f, event_name: e.target.value })} /></Field>
        <Field label="Slot"><input className={input} value={f.slot_label} onChange={(e) => setF({ ...f, slot_label: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seconds"><input type="number" className={input} value={f.slot_seconds} onChange={(e) => setF({ ...f, slot_seconds: Number(e.target.value) })} /></Field>
          <Field label="Est. impressions"><input type="number" className={input} value={f.est_impressions} onChange={(e) => setF({ ...f, est_impressions: Number(e.target.value) })} /></Field>
          <Field label="Reserve (π)"><input type="number" className={input} value={f.reserve_pi} onChange={(e) => setF({ ...f, reserve_pi: Number(e.target.value) })} /></Field>
          <Field label="Min raise (π)"><input type="number" className={input} value={f.min_increment_pi} onChange={(e) => setF({ ...f, min_increment_pi: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Open for (hours)"><input type="number" className={input} value={f.hours_open} onChange={(e) => setF({ ...f, hours_open: Number(e.target.value) })} /></Field>
        <button disabled={!f.venue_name || !f.event_name} onClick={create} className="w-full h-9 rounded-md bg-brand text-brand-foreground text-sm disabled:opacity-50">{t("Create auction")}</button>
      </div>
    </div>
  );
}
