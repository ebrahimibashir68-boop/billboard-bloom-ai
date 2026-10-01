import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";
import {
  AUDIT_SOURCES,
  CHANGE_TYPES,
  CONDITIONS,
  HOLD_EXPIRY_HOURS,
  HOLD_STATUS_LABELS,
  ILLUMINATION,
  PRODUCTION_MATERIALS,
  PRODUCTION_STATUS_LABELS,
  fmtInt,
  fmtPi,
  mediaPlanMetrics,
  productionQuote,
} from "@/lib/ooh/standards";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Traditional OOH Services · Pi Billboard" },
      {
        name: "description",
        content:
          "Media planning, holds, print & installation, proof of posting, site audits, permits and cancellations — every traditional billboard service, settled in Pi and anchored on-chain.",
      },
      { property: "og:title", content: "Traditional OOH Services on Pi Billboard" },
      {
        property: "og:description",
        content: "GRP/reach planning, avails & holds, production & posting, audits, permits and change requests for billboards worldwide.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://billboard-bloom-ai.lovable.app/services" }],
  }),
  component: ServicesPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Kind =
  | "media_plans"
  | "inventory_holds"
  | "production_orders"
  | "posting_proofs"
  | "site_audits"
  | "site_permits"
  | "campaign_change_requests";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "list";
  options?: { value: string; label: string }[];
  default?: string | number;
  optional?: boolean;
  step?: number;
};

type Row = Record<string, unknown> & { id: string; created_at: string };

const today = () => new Date().toISOString().slice(0, 10);
const opts = (arr: readonly string[]) => arr.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));

const SERVICES: {
  kind: Kind;
  label: string;
  blurb: string;
  fields: FieldDef[];
  summary: (r: Row) => { title: string; meta: string[]; badge?: string };
}[] = [
  {
    kind: "media_plans",
    label: "Media planning",
    blurb: "Turn a budget and CPM into planned impressions, GRPs, reach and average frequency for a market.",
    fields: [
      { key: "campaign_name", label: "Campaign name", type: "text" },
      { key: "markets", label: "Markets (comma separated)", type: "list" },
      { key: "target_population", label: "Target population", type: "number", default: 1_000_000 },
      { key: "budget_pi", label: "Budget (π)", type: "number", default: 500 },
      { key: "cpm_pi", label: "CPM (π per 1,000)", type: "number", default: 2, step: 0.01 },
      { key: "flight_start", label: "Flight start", type: "date", default: today() },
      { key: "flight_end", label: "Flight end", type: "date", default: today() },
      { key: "notes", label: "Notes", type: "textarea", optional: true },
    ],
    summary: (r) => ({
      title: String(r.campaign_name),
      badge: String(r.status),
      meta: [
        `${fmtInt(r.planned_impressions as number)} impressions`,
        `${r.grps} GRPs`,
        `Reach ${r.reach_pct}%`,
        `Freq ${r.avg_frequency}`,
        `${r.flight_start} → ${r.flight_end}`,
      ],
    }),
  },
  {
    kind: "inventory_holds",
    label: "Avails & holds",
    blurb: `Reserve a face for a date window. Holds lapse after ${HOLD_EXPIRY_HOURS}h unless firmed with a booking.`,
    fields: [
      { key: "location_name", label: "Billboard / venue", type: "text" },
      { key: "hold_start", label: "Hold from", type: "date", default: today() },
      { key: "hold_end", label: "Hold to", type: "date", default: today() },
      { key: "notes", label: "Notes", type: "textarea", optional: true },
    ],
    summary: (r) => ({
      title: String(r.location_name),
      badge: HOLD_STATUS_LABELS[String(r.status)] ?? String(r.status),
      meta: [`${r.hold_start} → ${r.hold_end}`, `Expires ${new Date(String(r.expires_at)).toLocaleString()}`],
    }),
  },
  {
    kind: "production_orders",
    label: "Production & installation",
    blurb: "Print, ship, post and take down physical faces — or deliver the digital file to an LED screen.",
    fields: [
      { key: "location_name", label: "Billboard / venue", type: "text" },
      { key: "material", label: "Material", type: "select", options: PRODUCTION_MATERIALS.map((m) => ({ value: m.id, label: m.label })), default: "vinyl" },
      { key: "width_m", label: "Width (m)", type: "number", default: 14.6, step: 0.1 },
      { key: "height_m", label: "Height (m)", type: "number", default: 4.3, step: 0.1 },
      { key: "quantity", label: "Quantity", type: "number", default: 1 },
      { key: "install_date", label: "Install (posting) date", type: "date", default: today() },
      { key: "removal_date", label: "Take-down date", type: "date", optional: true },
      { key: "notes", label: "Notes", type: "textarea", optional: true },
    ],
    summary: (r) => ({
      title: `${r.order_number} · ${r.location_name}`,
      badge: PRODUCTION_STATUS_LABELS[String(r.status)] ?? String(r.status),
      meta: [
        `${PRODUCTION_MATERIALS.find((m) => m.id === r.material)?.label ?? r.material}`,
        `${r.width_m}×${r.height_m} m × ${r.quantity}`,
        `Total ${fmtPi(r.total_pi as number)}`,
        `Post ${r.install_date}`,
      ],
    }),
  },
  {
    kind: "posting_proofs",
    label: "Proof of posting",
    blurb: "Photo + GPS evidence that a physical face went up. Each proof is hashed into the verifiable ledger.",
    fields: [
      { key: "location_name", label: "Billboard / venue", type: "text" },
      { key: "photo_url", label: "Photo URL", type: "text", optional: true },
      { key: "lat", label: "Latitude", type: "number", optional: true, step: 0.000001 },
      { key: "lng", label: "Longitude", type: "number", optional: true, step: 0.000001 },
      { key: "notes", label: "Notes", type: "textarea", optional: true },
    ],
    summary: (r) => ({
      title: String(r.location_name),
      badge: r.ledger_hash ? "On ledger" : "Recorded",
      meta: [
        `Posted ${new Date(String(r.posted_at)).toLocaleString()}`,
        r.ledger_hash ? `Hash ${String(r.ledger_hash).slice(0, 16)}…` : "",
        r.lat != null ? `${r.lat}, ${r.lng}` : "",
      ].filter(Boolean),
    }),
  },
  {
    kind: "site_audits",
    label: "Site & audience audits",
    blurb: "Independent audits of face condition, lighting, obstruction and traffic (Geopath / Route style).",
    fields: [
      { key: "location_name", label: "Billboard / venue", type: "text" },
      { key: "audit_source", label: "Audit source", type: "select", options: opts(AUDIT_SOURCES), default: AUDIT_SOURCES[0] },
      { key: "illumination", label: "Illumination", type: "select", options: opts(ILLUMINATION), default: "digital" },
      { key: "condition", label: "Condition", type: "select", options: opts(CONDITIONS), default: "good" },
      { key: "obstruction_pct", label: "Obstruction (%)", type: "number", default: 0 },
      { key: "daily_traffic", label: "Daily traffic count", type: "number", default: 50_000 },
      { key: "audited_at", label: "Audit date", type: "date", default: today() },
      { key: "notes", label: "Notes", type: "textarea", optional: true },
    ],
    summary: (r) => ({
      title: String(r.location_name),
      badge: `Score ${r.score}/100`,
      meta: [String(r.audit_source), `${String(r.condition)} · ${String(r.illumination).replace(/_/g, " ")}`, `${fmtInt(r.daily_traffic as number)} daily traffic`, String(r.audited_at)],
    }),
  },
  {
    kind: "site_permits",
    label: "Permits & compliance",
    blurb: "Track municipal permits and expiry for every physical face you operate or book.",
    fields: [
      { key: "location_name", label: "Billboard / venue", type: "text" },
      { key: "authority", label: "Issuing authority", type: "text" },
      { key: "permit_number", label: "Permit number", type: "text" },
      { key: "issued_on", label: "Issued on", type: "date", default: today() },
      { key: "expires_on", label: "Expires on", type: "date", default: today() },
      { key: "notes", label: "Notes", type: "textarea", optional: true },
    ],
    summary: (r) => ({
      title: `${r.permit_number} · ${r.location_name}`,
      badge: String(r.status),
      meta: [String(r.authority), `${r.issued_on} → ${r.expires_on}`],
    }),
  },
  {
    kind: "campaign_change_requests",
    label: "Cancel · renew · extend",
    blurb: "Standard cancellation ladder: free 60+ days out, 25% inside 60, 50% inside 30, 100% inside 14 days.",
    fields: [
      { key: "reference", label: "Booking / IO reference", type: "text" },
      { key: "change_type", label: "Change", type: "select", options: CHANGE_TYPES.map((c) => ({ value: c.id, label: c.label })), default: "cancel" },
      { key: "effective_date", label: "Effective date", type: "date", default: today() },
      { key: "new_end_date", label: "New end date", type: "date", optional: true },
      { key: "contract_value_pi", label: "Contract value (π)", type: "number", default: 0, step: 0.01 },
      { key: "reason", label: "Reason", type: "textarea", optional: true },
    ],
    summary: (r) => ({
      title: `${CHANGE_TYPES.find((c) => c.id === r.change_type)?.label ?? r.change_type} · ${r.reference}`,
      badge: String(r.status),
      meta: [`Effective ${r.effective_date}`, `Penalty ${r.penalty_pct}% = ${fmtPi(r.penalty_pi as number)}`],
    }),
  },
];

function ServicesPage() {
  return (
    <AppShell>
      <TopBar title="OOH Services" titleAs="h2" />
      <ServicesHub />
    </AppShell>
  );
}

function ServicesHub() {
  const { authenticate, status } = usePi();
  const [active, setActive] = useState<Kind>("media_plans");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const svc = SERVICES.find((s) => s.kind === active)!;

  const load = async (kind: Kind) => {
    if (status !== "ready") return;
    setLoading(true);
    try {
      const auth = await authenticate();
      const res = await fetch(`/api/public/pi-ooh-services?kind=${kind}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = (await res.json()) as { items?: Row[] };
      setRows(data.items ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setShowForm(false);
    void load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status]);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-xl bg-brand/10 border border-brand/40 flex items-center justify-center">
          <Briefcase className="size-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Traditional OOH Services</h1>
          <p className="text-sm text-muted-foreground">
            Everything a billboard buyer or operator did offline — now settled in π and anchored on the ledger.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {SERVICES.map((s) => (
          <button
            key={s.kind}
            onClick={() => setActive(s.kind)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              s.kind === active ? "bg-brand text-brand-foreground border-brand" : "bg-surface border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-sm text-muted-foreground max-w-2xl">{svc.blurb}</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 px-4 py-2.5 bg-brand text-brand-foreground rounded-xl font-semibold text-sm flex items-center gap-2"
        >
          <Plus className="size-4" />
          New
        </button>
      </div>

      {showForm && (
        <ServiceForm
          key={svc.kind}
          kind={svc.kind}
          fields={svc.fields}
          piReady={status === "ready"}
          authenticate={authenticate}
          onDone={() => {
            setShowForm(false);
            void load(active);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="mt-6 space-y-3">
        {status !== "ready" && (
          <div className="p-8 bg-surface border border-border rounded-2xl text-center text-sm text-muted-foreground">
            Open in Pi Browser and sign in to see your records.
          </div>
        )}
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && status === "ready" && rows.length === 0 && (
          <div className="p-8 bg-surface border border-border rounded-2xl text-center text-sm text-muted-foreground">
            Nothing here yet. Create the first record.
          </div>
        )}
        {rows.map((r) => {
          const s = svc.summary(r);
          return (
            <div key={r.id} className="p-5 bg-surface border border-border rounded-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{s.title}</h3>
                {s.badge && (
                  <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full bg-brand/10 text-brand border border-brand/30">
                    {s.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                {s.meta.map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceForm({
  kind,
  fields,
  piReady,
  authenticate,
  onDone,
  onCancel,
}: {
  kind: Kind;
  fields: FieldDef[];
  piReady: boolean;
  authenticate: () => Promise<{ accessToken: string }>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.default != null ? String(f.default) : ""])),
  );
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const preview = useMemo(() => {
    if (kind === "media_plans") {
      const m = mediaPlanMetrics({ budgetPi: Number(values.budget_pi), cpmPi: Number(values.cpm_pi), targetPopulation: Number(values.target_population) });
      return `${fmtInt(m.impressions)} impressions · ${m.grps} GRPs · reach ${m.reachPct}% · frequency ${m.frequency}`;
    }
    if (kind === "production_orders") {
      const q = productionQuote({ material: values.material, widthM: Number(values.width_m), heightM: Number(values.height_m), quantity: Number(values.quantity) });
      return `Production ${fmtPi(q.production)} + install ${fmtPi(q.install)} = ${fmtPi(q.total)}`;
    }
    return null;
  }, [kind, values]);

  const submit = async () => {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = values[f.key] ?? "";
      if (raw === "") {
        if (!f.optional) {
          toast.error(`${f.label} is required`);
          return;
        }
        continue;
      }
      payload[f.key] = f.type === "number" ? Number(raw) : f.type === "list" ? raw.split(",").map((s) => s.trim()).filter(Boolean) : raw;
    }
    setBusy(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-ooh-services", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ kind, payload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Request failed");
      toast.success("Saved");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const cls = "w-full p-3 bg-background border border-border rounded-xl text-sm";
  return (
    <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">
              {f.label}
              {f.optional && <span className="opacity-60"> (optional)</span>}
            </label>
            {f.type === "select" ? (
              <select className={cls} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea rows={3} className={`${cls} resize-none`} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} maxLength={1000} />
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                step={f.step}
                className={cls}
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                maxLength={120}
              />
            )}
          </div>
        ))}
      </div>
      {preview && <p className="text-xs text-brand font-medium">{preview}</p>}
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-3 bg-background border border-border rounded-xl font-semibold text-sm">
          Cancel
        </button>
        <button onClick={submit} disabled={busy || !piReady} className="flex-1 py-3 bg-brand text-brand-foreground rounded-xl font-semibold text-sm disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
