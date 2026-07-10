import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Monitor, Users, Clock, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/lib/pi/usePi";

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
  lat: number | null;
  lng: number | null;
}

interface Campaign {
  id: string;
  title: string;
  placement: string;
}

export const Route = createFileRoute("/locations/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Book ${params.slug.replace(/-/g, " ")} · Pi Billboard` },
      { name: "description", content: "Book this billboard with Pi." },
    ],
  }),
  component: LocationDetail,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function LocationDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { authenticate, status } = usePi();
  const [loc, setLoc] = useState<Location | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [hours, setHours] = useState(4);
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("billboard_locations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setLoc(data as Location | null);
    })();
  }, [slug]);

  useEffect(() => {
    if (status !== "ready") return;
    (async () => {
      try {
        const auth = await authenticate();
        const res = await fetch("/api/public/pi-campaigns", {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        if (res.ok) {
          const j = (await res.json()) as { campaigns: Campaign[] };
          setCampaigns(j.campaigns ?? []);
          if (j.campaigns?.[0]) setCampaignId(j.campaigns[0].id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [status, authenticate]);

  const submit = async () => {
    if (!loc) return;
    setSubmitting(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-bookings?action=create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          location_id: loc.id,
          campaign_id: campaignId || null,
          starts_at: new Date(startsAt).toISOString(),
          hours,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      toast.success(`Booked! Invoice for ${Number(j.total_pi).toFixed(2)} π issued.`);
      navigate({ to: "/bookings" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loc) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const quote = loc.hourly_pi_rate * hours;
  const fee = +(quote * 0.08).toFixed(4);
  const total = quote + fee;

  return (
    <AppShell>
      <TopBar title={loc.name} />
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
        {loc.image_url && (
          <img src={loc.image_url} alt={loc.name} className="w-full h-64 object-cover rounded-2xl" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{loc.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <MapPin className="size-4" /> {loc.city}, {loc.country}
            {loc.is_programmatic && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand ml-2">
                <Zap className="size-3" /> Programmatic
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={Monitor} label="Size" value={loc.size_meters ?? "—"} />
          <Stat icon={Monitor} label="Resolution" value={loc.resolution ?? "—"} />
          <Stat icon={Users} label="Daily imp." value={`${(loc.daily_impressions / 1000).toFixed(0)}k`} />
          <Stat icon={Clock} label="Slot" value={`${loc.slot_seconds}s`} />
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Book this billboard
          </h2>
          {status !== "ready" ? (
            <p className="text-sm text-muted-foreground">Open in Pi Browser to book.</p>
          ) : (
            <>
              <label className="block">
                <span className="text-xs text-muted-foreground">Campaign (optional)</span>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="">— none —</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Starts at</span>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Hours</span>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={hours}
                    onChange={(e) => setHours(Math.max(1, Math.min(720, +e.target.value || 1)))}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </label>
              </div>
              <div className="text-sm space-y-1 pt-3 border-t border-border">
                <Row label={`${loc.hourly_pi_rate} π × ${hours}h`} value={`${quote.toFixed(2)} π`} />
                <Row label="Platform fee (8%)" value={`${fee.toFixed(2)} π`} />
                <Row label="Total" value={`${total.toFixed(2)} π`} bold />
              </div>
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold disabled:opacity-50"
              >
                {submitting ? "Booking…" : "Book & issue invoice"}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                {loc.is_programmatic
                  ? "Programmatic partner — auto-approved on booking."
                  : "Non-programmatic partner — booking awaits manual approval."}
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 bg-surface border border-border rounded-xl">
      <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
        <Icon className="size-3" /> {label}
      </p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
