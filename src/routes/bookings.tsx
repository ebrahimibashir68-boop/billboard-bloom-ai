import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";

interface Booking {
  id: string;
  starts_at: string;
  hours: number;
  quoted_pi: number;
  platform_fee_pi: number;
  total_pi: number;
  status: string;
  invoice_id: string | null;
  billboard_locations: { name: string; city: string; country: string; image_url: string | null; slug: string } | null;
  invoices: { id: string; invoice_number: string; status: string; total_pi: number; due_at: string; paid_at: string | null } | null;
}

interface Play {
  id: string;
  played_at: string;
  impressions: number;
}

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings · Pi Billboard" },
      { name: "description", content: "Your billboard bookings, invoices, and proof-of-play." },
    ],
  }),
  component: BookingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function BookingsPage() {
  const { authenticate, status } = usePi();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [plays, setPlays] = useState<Record<string, Play[]>>({});
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-bookings", {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const j = (await res.json()) as { bookings: Booking[] };
      setBookings(j.bookings ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [authenticate]);

  useEffect(() => {
    if (status === "ready") load();
  }, [status, load]);

  const pay = async (invoiceId: string) => {
    setPaying(invoiceId);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-bookings?action=pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      toast.success(`Paid. ${j.plays_created} proof-of-play rows generated.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPaying(null);
    }
  };

  const toggle = async (b: Booking) => {
    if (expanded === b.id) {
      setExpanded(null);
      return;
    }
    setExpanded(b.id);
    if (!plays[b.id]) {
      try {
        const auth = await authenticate();
        const res = await fetch("/api/public/pi-bookings?action=plays", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: JSON.stringify({ booking_id: b.id }),
        });
        const j = (await res.json()) as { plays: Play[] };
        setPlays((p) => ({ ...p, [b.id]: j.plays ?? [] }));
      } catch {
        /* ignore */
      }
    }
  };

  if (status !== "ready") {
    return (
      <AppShell>
        <TopBar title="Bookings" />
        <div className="p-8 text-center text-muted-foreground text-sm">
          Open in Pi Browser to view your bookings.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Bookings" />
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">My bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pay open invoices to start playback. Proof-of-play appears once paid.
          </p>
        </header>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No bookings yet. Browse the <a href="/locations" className="text-brand underline">billboard inventory</a>.
          </p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const bookingPlays = plays[b.id] ?? [];
              const impressions = bookingPlays.reduce((s, p) => s + p.impressions, 0);
              return (
                <div key={b.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggle(b)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-surface-elevated transition-colors"
                  >
                    {b.billboard_locations?.image_url && (
                      <img
                        src={b.billboard_locations.image_url}
                        alt=""
                        className="size-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{b.billboard_locations?.name ?? "Booking"}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.billboard_locations?.city}, {b.billboard_locations?.country} · {b.hours}h starting{" "}
                        {new Date(b.starts_at).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <StatusPill status={b.status} /> · {b.total_pi} π total
                      </p>
                    </div>
                    {expanded === b.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                  {expanded === b.id && (
                    <div className="border-t border-border p-4 space-y-3 bg-background">
                      {b.invoices && (
                        <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                          <div className="text-xs">
                            <p className="font-mono">{b.invoices.invoice_number}</p>
                            <p className="text-muted-foreground">
                              Status: {b.invoices.status} · Due {new Date(b.invoices.due_at).toLocaleDateString()}
                            </p>
                          </div>
                          {b.invoices.status === "issued" ? (
                            <button
                              onClick={() => pay(b.invoices!.id)}
                              disabled={paying === b.invoices.id}
                              className="px-3 py-1.5 bg-brand text-brand-foreground rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                              {paying === b.invoices.id ? "Paying…" : `Pay ${b.invoices.total_pi} π`}
                            </button>
                          ) : (
                            <span className="text-xs text-success flex items-center gap-1">
                              <Receipt className="size-3" /> Paid
                            </span>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                          Proof-of-play ({bookingPlays.length} rows · {impressions.toLocaleString()} impressions)
                        </p>
                        {bookingPlays.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No plays yet — pay the invoice to start playback.
                          </p>
                        ) : (
                          <div className="max-h-64 overflow-auto text-[11px] font-mono space-y-0.5">
                            {bookingPlays.slice(0, 200).map((p) => (
                              <div key={p.id} className="flex justify-between text-muted-foreground">
                                <span>{new Date(p.played_at).toLocaleString()}</span>
                                <span>{p.impressions.toLocaleString()} imp</span>
                              </div>
                            ))}
                            {bookingPlays.length > 200 && (
                              <p className="text-muted-foreground pt-1">
                                …and {bookingPlays.length - 200} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "running" || status === "completed"
      ? "text-success"
      : status === "rejected"
        ? "text-destructive"
        : status === "approved"
          ? "text-brand"
          : "text-warning";
  return <span className={`font-semibold ${cls}`}>{status}</span>;
}
