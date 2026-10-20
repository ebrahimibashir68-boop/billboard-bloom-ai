import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ClipboardList, Download, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePi } from "@/lib/pi/usePi";
import { SERVICE_LINKS, STATUS_LABELS, TRANSITIONS, WORK_CATEGORIES, WorkOrderSchema, type WorkStatus } from "@/lib/ooh/operations";
import type { Database } from "@/integrations/supabase/types";
import billboard from "@/assets/billboard-preview.jpg";

export const Route = createFileRoute("/operations")({
  head: () => ({ meta: [
    { title: "Billboard Operations & Evidence · Pi Billboard" },
    { name: "description", content: "Manage site rights, engineering, production logistics, maintenance, permits, makegoods and removal with Pi-owned work orders and tamper-evident evidence history." },
    { property: "og:title", content: "Billboard Operations & Evidence · Pi Billboard" },
    { property: "og:description", content: "Connected advertising operations, Pi settlement services and verifiable work-order histories for physical and digital billboards." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://billboard-bloom-ai.lovable.app/operations" }] }),
  component: OperationsPage,
});

type WorkOrder = Database["public"]["Tables"]["billboard_work_orders"]["Row"];
type WorkEvent = Database["public"]["Tables"]["billboard_work_events"]["Row"];
const fieldClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const labelClass = "flex flex-col gap-2 text-xs text-muted-foreground min-w-0";

function OperationsPage() {
  return <AppShell><TopBar title="Billboard operations" /><OperationsWorkspace /></AppShell>;
}

function OperationsWorkspace() {
  const { user, getAccessToken } = usePi();
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [tab, setTab] = useState("orders");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [next, setNext] = useState<WorkStatus>("submitted");

  const api = useCallback(async (path = "", payload?: object) => {
    const token = await getAccessToken();
    const response = await fetch(`/api/public/pi-operations${path}`, {
      method: payload ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed");
    return result;
  }, [getAccessToken]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try { const result = await api(); setItems(result.items); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load operations"); }
    finally { setLoading(false); }
  }, [api, user]);
  useEffect(() => { void load(); }, [load]);

  const open = async (id: string) => {
    setBusy(true);
    try {
      const result = await api(`?id=${id}`);
      setSelected(result.item); setEvents(result.events); setNote(""); setEvidence("");
      setNext(TRANSITIONS[result.item.status as WorkStatus][0] ?? "completed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load history"); }
    finally { setBusy(false); }
  };
  const transition = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api("", { action: "transition", payload: { id: selected.id, version: selected.version, status: next, note, evidence_url: evidence || undefined } });
      toast.success("Work order and evidence history recorded");
      await open(selected.id); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not record update"); }
    finally { setBusy(false); }
  };
  const exportDossier = () => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify({ record_type: "Pi Billboard operational dossier", verification: "Application hash-chain; not a Pi transaction or independent site certification", work_order: selected, events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `work-order-${selected.id}.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  const filtered = useMemo(() => items.filter((item) => (category === "all" || item.category === category) && `${item.title} ${item.site_name} ${item.market} ${item.reference ?? ""}`.toLowerCase().includes(search.toLowerCase())), [items, category, search]);
  const openCount = items.filter((item) => !["completed", "cancelled"].includes(item.status)).length;
  const overdue = items.filter((item) => item.due_on < new Date().toISOString().slice(0, 10) && !["completed", "cancelled"].includes(item.status)).length;

  return <div className="mx-auto w-full max-w-7xl p-4 md:p-8 space-y-7">
    <header className="grid md:grid-cols-[1fr_240px] gap-5 items-center border-b border-border pb-6">
      <div><div className="flex items-center gap-2 text-brand text-xs font-mono mb-3"><ClipboardList className="size-4" /> PI BILLBOARD / OPERATIONS</div>
        <h1 className="text-3xl font-semibold">Billboard infrastructure</h1>
        <p className="text-sm text-muted-foreground mt-3">Site rights · Production · Field operations · Evidence · Pi settlement</p>
      </div>
      <img src={billboard} alt="Digital billboard at a live sports stadium" className="w-full h-32 object-cover rounded-md" />
    </header>
    <div className="grid grid-cols-3 gap-3 border-b border-border pb-5">
      {[{ label: "Open work orders", value: openCount }, { label: "Overdue", value: overdue }, { label: "Evidence pending acceptance", value: items.filter((item) => item.status === "evidence_submitted").length }].map((metric) => <div key={metric.label} className="min-w-0"><div className="text-2xl font-mono text-brand">{metric.value}</div><div className="text-xs text-muted-foreground mt-1 break-words">{metric.label}</div></div>)}
    </div>
    <div className="flex gap-2 border-b border-border pb-3">
      <Button variant={tab === "orders" ? "secondary" : "ghost"} onClick={() => setTab("orders")}>Work orders</Button>
      <Button variant={tab === "services" ? "secondary" : "ghost"} onClick={() => setTab("services")}>Service network</Button>
    </div>
    {tab === "services" ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {SERVICE_LINKS.map((service, i) => <Link key={service.to} to={service.to} className="border border-border bg-surface rounded-lg p-5 group min-w-0 hover:border-brand/50 transition-colors">
        <div className="text-xs text-brand font-mono mb-3">{String(i + 1).padStart(2, "0")} / {service.stage}</div>
        <div className="flex items-start justify-between gap-3"><h2 className="text-sm font-medium">{service.label}</h2><ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-brand" /></div>
      </Link>)}
    </div> : <>
      <div className="flex flex-wrap gap-3 items-center">
        <Input aria-label="Search work orders" placeholder="Search site, market or reference" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-40" />
        <select aria-label="Filter work category" className={`${fieldClass} sm:w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All operations</option>{WORK_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <Button size="icon" variant="outline" title="Refresh work orders" aria-label="Refresh work orders" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
        <Button disabled={!user} onClick={() => setShowForm(!showForm)}><Plus /> New work order</Button>
      </div>
      {showForm && <WorkOrderForm busy={busy} onCancel={() => setShowForm(false)} onSave={async (payload) => {
        setBusy(true);
        try { const result = await api("", { action: "create", payload }); setShowForm(false); toast.success("Work order anchored to the record ledger"); await load(); await open(result.id); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
        finally { setBusy(false); }
      }} />}
      {error && <div role="alert" className="text-sm text-destructive">{error}</div>}
      {loading ? <p className="text-sm text-muted-foreground" role="status">Loading operations…</p> : filtered.length === 0 ? <div className="py-12 text-center border-y border-border"><ClipboardList className="size-8 mx-auto text-muted-foreground mb-3" /><h2 className="font-medium">{items.length ? "No matching work orders" : "No work orders yet"}</h2></div> : <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((item) => <Button key={item.id} variant="outline" onClick={() => void open(item.id)} disabled={busy} className="h-auto w-full p-4 flex flex-col items-start whitespace-normal text-left gap-2">
          <span className="text-xs text-brand">{WORK_CATEGORIES.find((c) => c.id === item.category)?.label}</span>
          <span className="font-semibold break-words">{item.title}</span><span className="text-xs text-muted-foreground break-words">{item.site_name} · {item.market}</span>
          <span className="flex flex-wrap gap-3 text-xs"><span>{STATUS_LABELS[item.status as WorkStatus]}</span><span className="text-muted-foreground">Due {item.due_on}</span><span className="text-muted-foreground">Estimate {Number(item.budget_pi).toLocaleString()} π</span></span>
        </Button>)}
      </div>}
    </>}
    {selected && <section className="border-t border-border pt-6 space-y-5" aria-label="Work order dossier">
      <div className="flex flex-wrap items-start gap-3 justify-between"><div className="min-w-0"><h2 className="text-xl font-semibold break-words">{selected.title}</h2><p className="text-sm text-muted-foreground mt-1">{selected.site_name} · {selected.market} · v{selected.version}</p></div><div className="flex gap-2"><Button variant="outline" size="icon" title="Download dossier" aria-label="Download dossier" onClick={exportDossier}><Download /></Button><Button variant="ghost" size="icon" aria-label="Close dossier" onClick={() => setSelected(null)}><X /></Button></div></div>
      <dl className="grid sm:grid-cols-3 gap-4 text-sm"><div><dt className="text-xs text-muted-foreground">Booking / permit / agreement reference</dt><dd className="break-words mt-1">{selected.reference || "Not linked"}</dd></div><div><dt className="text-xs text-muted-foreground">Supplier / field team</dt><dd className="break-words mt-1">{selected.supplier || "Unassigned"}</dd></div><div><dt className="text-xs text-muted-foreground">Estimated budget · not charged</dt><dd className="mt-1">{Number(selected.budget_pi).toLocaleString()} π</dd></div></dl>
      {selected.description && <p className="text-sm whitespace-pre-wrap break-words">{selected.description}</p>}
      <div><h3 className="text-sm font-semibold mb-3 flex gap-2 items-center"><ShieldCheck className="size-4 text-brand" /> Evidence history</h3>
        <ol className="border-l border-border pl-4 space-y-5">{events.map((event) => <li key={event.id} className="space-y-1"><div className="text-sm font-medium">{STATUS_LABELS[event.to_status as WorkStatus]}</div><time className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time><p className="text-sm whitespace-pre-wrap break-words">{event.note}</p>{event.evidence_url && <a href={event.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand underline">View submitted evidence</a>}<p className="font-mono text-[10px] text-muted-foreground break-all">{event.ledger_hash}</p></li>)}</ol>
      </div>
      {TRANSITIONS[selected.status as WorkStatus].length > 0 && <form onSubmit={(e) => { e.preventDefault(); void transition(); }} className="grid sm:grid-cols-2 gap-4 border-t border-border pt-5">
        <label className={labelClass}>Next state<select className={fieldClass} value={next} onChange={(e) => setNext(e.target.value as WorkStatus)}>{TRANSITIONS[selected.status as WorkStatus].map((state) => <option value={state} key={state}>{STATUS_LABELS[state]}</option>)}</select></label>
        <label className={labelClass}>Evidence URL {next === "evidence_submitted" ? "(required)" : "(optional)"}<Input type="url" placeholder="https://" value={evidence} onChange={(e) => setEvidence(e.target.value)} required={next === "evidence_submitted"} maxLength={2000} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Event note<Textarea required maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy || !note.trim()}>{busy ? "Recording…" : "Record state transition"}</Button></div>
      </form>}
    </section>}
    <footer className="text-xs text-muted-foreground border-t border-border pt-4 leading-relaxed">Operational evidence is owner-submitted and recorded in the application’s tamper-evident hash-chain, not independently certified or deployed as a Pi smart contract. Payments use official Pi Mainnet settlement. Site rights, safety, local permits and physical delivery require the responsible operator’s approval.</footer>
  </div>;
}

function WorkOrderForm({ busy, onSave, onCancel }: { busy: boolean; onSave: (payload: object) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState({ category: "site_rights", title: "", site_name: "", market: "", reference: "", supplier: "", due_on: "", budget_pi: "0", description: "" });
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  return <form aria-label="New work order" onSubmit={(e) => {
    e.preventDefault();
    const parsed = WorkOrderSchema.safeParse({ ...values, budget_pi: Number(values.budget_pi) });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check work order fields"); return; }
    void onSave(parsed.data);
  }} className="border-y border-border py-6 space-y-5">
    <h2 className="font-semibold">New operational work order</h2>
    <div className="grid sm:grid-cols-2 gap-4">
      <label className={labelClass}>Operation<select className={fieldClass} value={values.category} onChange={(e) => update("category", e.target.value)}>{WORK_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
      {([{ key: "title", label: "Work order title", required: true }, { key: "site_name", label: "Billboard / venue", required: true }, { key: "market", label: "City / country", required: true }, { key: "reference", label: "Booking, agreement or permit reference" }, { key: "supplier", label: "Supplier / field team" }, { key: "due_on", label: "Due date", type: "date", required: true }, { key: "budget_pi", label: "Estimated budget (π) · no payment", type: "number", required: true }] as const).map((field) => <label key={field.key} className={labelClass}>{field.label}<Input type={"type" in field ? field.type : "text"} required={"required" in field && field.required} value={values[field.key]} onChange={(e) => update(field.key, e.target.value)} maxLength={160} min={0} max={10000000} step="0.0000001" /></label>)}
      <label className={`${labelClass} sm:col-span-2`}>Scope, rights, safety requirements or resolution requested<Textarea value={values.description} onChange={(e) => update("description", e.target.value)} maxLength={4000} /></label>
    </div><div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Create work order"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
  </form>;
}