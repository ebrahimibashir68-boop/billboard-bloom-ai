import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Globe, Calendar, Coins } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";

type Rfp = {
  id: string;
  campaign_name: string;
  brief: string;
  objective: string | null;
  target_countries: string[] | null;
  target_cities: string[] | null;
  budget_pi: number;
  start_date: string;
  end_date: string;
  preferred_formats: string[] | null;
  status: string;
  advertiser_pi_username: string | null;
  created_at: string;
};

export const Route = createFileRoute("/rfps")({
  head: () => ({
    meta: [
      { title: "Billboard RFP Marketplace · Pi Billboard" },
      {
        name: "description",
        content:
          "Post a media brief and let real billboard advertising companies bid to run your out-of-home campaign worldwide.",
      },
      { property: "og:title", content: "Billboard RFP Marketplace" },
      {
        property: "og:description",
        content:
          "Post an out-of-home advertising brief; approved billboard partners submit proposals with venues, impressions and price.",
      },
    ],
  }),
  component: RfpsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function RfpsPage() {
  return (
    <AppShell>
      <TopBar title="RFP Marketplace" />
      <RfpMarketplace />
    </AppShell>
  );
}

function RfpMarketplace() {
  const { authenticate, status } = usePi();
  const [rfps, setRfps] = useState<Rfp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/pi-rfps");
      const data = (await res.json()) as { rfps?: Rfp[] };
      setRfps(data.rfps ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-brand/10 border border-brand/40 flex items-center justify-center">
            <FileText className="size-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">RFP Marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Publish a media brief. Approved billboard companies bid on your campaign.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="shrink-0 px-4 py-2.5 bg-brand text-brand-foreground rounded-xl font-semibold text-sm flex items-center gap-2"
        >
          <Plus className="size-4" />
          Post RFP
        </button>
      </div>

      {showForm && (
        <RfpForm
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
          authenticate={authenticate}
          piReady={status === "ready"}
        />
      )}

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading open RFPs…</p>}
        {!loading && rfps.length === 0 && (
          <div className="p-8 bg-surface border border-border rounded-2xl text-center text-sm text-muted-foreground">
            No open RFPs yet. Post the first one.
          </div>
        )}
        {rfps.map((r) => (
          <RfpCard key={r.id} rfp={r} />
        ))}
      </div>
    </div>
  );
}

function RfpCard({ rfp }: { rfp: Rfp }) {
  return (
    <div className="p-5 bg-surface border border-border rounded-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{rfp.campaign_name}</h3>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full bg-brand/10 text-brand border border-brand/30">
              {rfp.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rfp.brief}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 text-brand font-bold">
            <Coins className="size-4" />
            {rfp.budget_pi.toLocaleString()} π
          </div>
          {rfp.advertiser_pi_username && (
            <div className="text-[11px] text-muted-foreground mt-1">@{rfp.advertiser_pi_username}</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {rfp.start_date} → {rfp.end_date}
        </span>
        {rfp.target_countries && rfp.target_countries.length > 0 && (
          <span className="flex items-center gap-1">
            <Globe className="size-3" />
            {rfp.target_countries.join(", ")}
          </span>
        )}
        {rfp.preferred_formats && rfp.preferred_formats.length > 0 && (
          <span>Formats: {rfp.preferred_formats.join(", ")}</span>
        )}
        {rfp.objective && <span>Goal: {rfp.objective}</span>}
      </div>
    </div>
  );
}

function RfpForm({
  onCancel,
  onCreated,
  authenticate,
  piReady,
}: {
  onCancel: () => void;
  onCreated: () => void;
  authenticate: () => Promise<{ accessToken: string }>;
  piReady: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [objective, setObjective] = useState<"awareness" | "traffic" | "sales" | "launch" | "other">("awareness");
  const [audience, setAudience] = useState("");
  const [countries, setCountries] = useState("");
  const [cities, setCities] = useState("");
  const [budget, setBudget] = useState<number>(500);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || brief.trim().length < 10 || end <= start || budget <= 0) return;
    setBusy(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-rfps", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({
          campaign_name: name.trim(),
          brief: brief.trim(),
          objective,
          target_audience: audience.trim() || undefined,
          target_countries: countries
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          target_cities: cities
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          budget_pi: budget,
          start_date: start,
          end_date: end,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to post RFP");
      toast.success("RFP posted", { description: "Partners can now bid on your brief." });
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post RFP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
      <h2 className="font-semibold">New RFP</h2>
      <Field label="Campaign name">
        <input
          className="w-full p-3 bg-background border border-border rounded-xl text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
      </Field>
      <Field label="Brief (goals, message, brand)">
        <textarea
          rows={4}
          className="w-full p-3 bg-background border border-border rounded-xl text-sm resize-none"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={2000}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Objective">
          <select
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={objective}
            onChange={(e) => setObjective(e.target.value as typeof objective)}
          >
            <option value="awareness">Awareness</option>
            <option value="traffic">Traffic</option>
            <option value="sales">Sales</option>
            <option value="launch">Launch</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Budget (π)">
          <input
            type="number"
            min={1}
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Target audience (optional)">
        <input
          className="w-full p-3 bg-background border border-border rounded-xl text-sm"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          maxLength={500}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Countries (comma separated)">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            placeholder="USA, UK, Japan"
          />
        </Field>
        <Field label="Cities (comma separated)">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            placeholder="New York, London"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date">
          <input
            type="date"
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="End date">
          <input
            type="date"
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-background border border-border rounded-xl font-semibold text-sm"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy || !piReady}
          className="flex-1 py-3 bg-brand text-brand-foreground rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post RFP"}
        </button>
      </div>
      {!piReady && (
        <p className="text-[11px] text-muted-foreground text-center">
          Open in Pi Browser to sign in with your Pi identity.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
