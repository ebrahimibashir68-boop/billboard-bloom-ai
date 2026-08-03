import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Gauge, RefreshCw, TrendingDown, TrendingUp, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";
import { DAYPARTS, MAKE_GOOD_THRESHOLD_PCT, fmtInt, fmtPi } from "@/lib/ooh/standards";
import { toast } from "sonner";

export const Route = createFileRoute("/measurement")({
  head: () => ({
    meta: [
      { title: "Delivery & Impression Measurement · Pi Billboard" },
      {
        name: "description",
        content:
          "Booked vs delivered impressions, effective CPM, daypart multipliers and automatic under-delivery credit notes for every Pi Billboard campaign.",
      },
      { property: "og:title", content: "Delivery & Impression Measurement" },
      {
        property: "og:description",
        content:
          "Audit booked vs delivered DOOH impressions, effective CPM and make-good credits, settled in Pi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Delivery & Impression Measurement" },
      {
        name: "twitter:description",
        content: "Booked vs delivered DOOH impressions, effective CPM and make-good credits.",
      },
    ],
  }),
  component: MeasurementPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface Booking {
  id: string;
  starts_at: string;
  hours: number;
  status: string;
  total_pi: number;
  cpm_pi: number | null;
  booked_impressions: number;
  delivered_impressions: number;
  billboard_locations: { name: string; city: string; country: string } | null;
}
interface Report {
  id: string;
  booking_id: string | null;
  report_date: string;
  booked_impressions: number;
  delivered_impressions: number;
  plays: number;
  cpm_pi: number;
  spend_pi: number;
  discrepancy_pct: number;
}
interface CreditNote {
  id: string;
  credit_note_number: string;
  amount_pi: number;
  reason: string;
  status: string;
  issued_at: string;
}

function MeasurementPage() {
  const { user, authenticate } = usePi();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [credits, setCredits] = useState<CreditNote[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-delivery", {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (!res.ok) throw new Error("Could not load delivery data");
      const j = (await res.json()) as {
        bookings: Booking[];
        reports: Report[];
        credit_notes: CreditNote[];
      };
      setBookings(j.bookings);
      setReports(j.reports);
      setCredits(j.credit_notes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in with Pi to view delivery");
    } finally {
      setLoading(false);
    }
  }, [authenticate]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function reconcile(bookingId: string) {
    setBusy(bookingId);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const j = (await res.json()) as {
        error?: string;
        discrepancy_pct?: number;
        credit_note?: { credit_note_number: string; amount_pi: number } | null;
      };
      if (!res.ok) throw new Error(j.error ?? "Reconciliation failed");
      toast.success(
        j.credit_note
          ? `Under-delivery ${j.discrepancy_pct}% — credit note ${j.credit_note.credit_note_number} for ${j.credit_note.amount_pi} π`
          : `Reconciled — variance ${j.discrepancy_pct}%`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setBusy(null);
    }
  }

  const totalBooked = reports.reduce((s, r) => s + Number(r.booked_impressions), 0);
  const totalDelivered = reports.reduce((s, r) => s + Number(r.delivered_impressions), 0);
  const totalSpend = reports.reduce((s, r) => s + Number(r.spend_pi), 0);
  const blendedCpm = totalDelivered > 0 ? (totalSpend / totalDelivered) * 1000 : 0;

  return (
    <AppShell>
      <TopBar title="Pi Billboard" titleAs="h2" />
      <div className="p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
        <header>
          <div className="inline-flex items-center gap-2 text-xs text-brand font-mono uppercase tracking-widest mb-2">
            <Gauge className="size-3.5" /> Audience measurement
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">Delivery &amp; impressions</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Every campaign is measured the way global out-of-home buyers expect: booked
            impressions against verified proof-of-play delivery, effective CPM, and an
            automatic credit note whenever delivery falls more than{" "}
            {Math.abs(MAKE_GOOD_THRESHOLD_PCT)}% short.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Booked impressions", value: fmtInt(totalBooked) },
            { label: "Delivered impressions", value: fmtInt(totalDelivered) },
            { label: "Media spend", value: fmtPi(totalSpend) },
            { label: "Blended eCPM", value: fmtPi(blendedCpm, 4) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
              <div className="text-lg font-semibold tabular-nums mt-1">{s.value}</div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Campaign delivery
            </h2>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="text-xs inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {!user && (
            <p className="text-sm text-muted-foreground rounded-xl border border-border bg-surface p-4">
              Sign in with Pi to audit your campaign delivery.
            </p>
          )}

          {user && bookings.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground rounded-xl border border-border bg-surface p-4">
              No bookings yet. Book a billboard and delivery reporting starts automatically.
            </p>
          )}

          <div className="space-y-2">
            {bookings.map((b) => {
              const booked = Number(b.booked_impressions);
              const delivered = Number(b.delivered_impressions);
              const variance = booked > 0 ? ((delivered - booked) / booked) * 100 : 0;
              const under = variance <= MAKE_GOOD_THRESHOLD_PCT;
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {b.billboard_locations?.name ?? "Billboard"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.billboard_locations?.city}, {b.billboard_locations?.country} ·{" "}
                      {new Date(b.starts_at).toLocaleString()} · {b.hours}h · {b.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Booked
                    </div>
                    <div className="text-sm tabular-nums">{fmtInt(booked)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Delivered
                    </div>
                    <div className="text-sm tabular-nums">{fmtInt(delivered)}</div>
                  </div>
                  <div
                    className={`text-right ${under ? "text-destructive" : "text-success"} min-w-20`}
                  >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Variance
                    </div>
                    <div className="text-sm tabular-nums inline-flex items-center gap-1">
                      {under ? (
                        <TrendingDown className="size-3.5" />
                      ) : (
                        <TrendingUp className="size-3.5" />
                      )}
                      {booked > 0 ? `${variance.toFixed(1)}%` : "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => void reconcile(b.id)}
                    disabled={busy === b.id}
                    className="text-xs font-semibold rounded-lg border border-brand/40 text-brand px-3 py-1.5 hover:bg-brand/10 disabled:opacity-50"
                  >
                    {busy === b.id ? "Measuring…" : "Reconcile"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {credits.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Credit notes
            </h2>
            <div className="space-y-2">
              {credits.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-surface p-4 flex items-center gap-4"
                >
                  <ReceiptText className="size-4 text-brand shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm truncate">{c.credit_note_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.reason.replace(/_/g, " ")} · {new Date(c.issued_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-brand">
                    {fmtPi(Number(c.amount_pi))}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Daypart multipliers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DAYPARTS.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-sm font-medium">{d.label}</div>
                <div className="text-xs text-muted-foreground font-mono">{d.hours}</div>
                <div className="text-lg font-semibold tabular-nums text-brand mt-1">
                  ×{d.multiplier}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
