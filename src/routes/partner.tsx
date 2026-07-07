import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, XCircle, Clock, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Partner Console · Pi Billboard" },
      {
        name: "description",
        content: "Review incoming ad contracts, approve or reject creatives, and manage your billboard venues.",
      },
    ],
  }),
  component: PartnerPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface Partner {
  id: string;
  company_name: string;
  status: string;
  country: string;
  revenue_share_pct: number;
}

interface Contract {
  id: string;
  title: string;
  body_text: string;
  image_url: string | null;
  tier: string;
  advertiser_pi_username: string;
  cost_pi: number;
  contract_hash: string;
}

interface Placement {
  id: string;
  venue_code: string;
  venue_name: string;
  sport: string;
  status: string;
}

interface ApprovalRequest {
  id: string;
  contract_id: string;
  status: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  ad_contracts: Contract | null;
  ad_placements: Placement[];
}

interface Venue {
  code: string;
  name: string;
  sport: string;
  placement: string;
  city: string | null;
  country: string | null;
  active: boolean;
}

function PartnerPage() {
  return (
    <AppShell>
      <TopBar />
      <PartnerDashboard />
    </AppShell>
  );
}

function PartnerDashboard() {
  const { authenticate, status } = usePi();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-partners", {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as {
        partner: Partner | null;
        requests: ApprovalRequest[];
        venues: Venue[];
      };
      setPartner(data.partner);
      setRequests(data.requests ?? []);
      setVenues(data.venues ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [authenticate]);

  useEffect(() => {
    if (status === "ready") load();
  }, [status, load]);

  const decide = async (
    request_id: string,
    decision: "approved" | "rejected" | "changes_requested",
  ) => {
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-partners?action=decide-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ request_id, decision }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(`Marked ${decision.replace("_", " ")}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (status !== "ready") {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Open in Pi Browser to access the partner console.
      </div>
    );
  }
  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  if (!partner) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-3">
        <Building2 className="size-10 mx-auto text-brand" />
        <h1 className="text-xl font-bold">Not a registered partner yet</h1>
        <p className="text-sm text-muted-foreground">
          Register your company to start receiving AI-matched ad contracts.
        </p>
        <Link
          to="/partners/register"
          className="inline-block py-2 px-4 bg-brand text-brand-foreground rounded-xl font-semibold"
        >
          Register now
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold">{partner.company_name}</h1>
          <p className="text-sm text-muted-foreground">
            {partner.country} · Revenue share {partner.revenue_share_pct}%
          </p>
        </div>
        <StatusBadge status={partner.status} />
      </header>

      {partner.status !== "approved" && (
        <div className="p-4 bg-warning/10 border border-warning/40 rounded-xl text-sm">
          Your application is <b>{partner.status}</b>. You'll be able to receive contracts once an
          admin approves.
        </div>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Approval queue ({requests.filter((r) => r.status === "pending").length} pending)
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contracts yet.</p>
        ) : (
          <div className="grid gap-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} onDecide={decide} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Your venues ({venues.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {venues.map((v) => (
            <div key={v.code} className="p-3 bg-surface border border-border rounded-xl">
              <p className="text-sm font-semibold">{v.name}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="size-3" /> {v.city ?? ""}
                {v.city && v.country ? ", " : ""}
                {v.country ?? ""} · {v.sport}
              </p>
            </div>
          ))}
          {venues.length === 0 && (
            <p className="text-sm text-muted-foreground">No venues on file yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; label: string; icon: React.ElementType }> = {
    approved: { bg: "bg-success/10 text-success border-success/40", label: "Approved", icon: CheckCircle2 },
    pending: { bg: "bg-warning/10 text-warning border-warning/40", label: "Pending", icon: Clock },
    rejected: { bg: "bg-destructive/10 text-destructive border-destructive/40", label: "Rejected", icon: XCircle },
    suspended: { bg: "bg-muted/20 text-muted-foreground border-border", label: "Suspended", icon: Clock },
  };
  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold ${c.bg}`}>
      <Icon className="size-3" />
      {c.label}
    </span>
  );
}

function RequestCard({
  request,
  onDecide,
}: {
  request: ApprovalRequest;
  onDecide: (id: string, d: "approved" | "rejected" | "changes_requested") => void;
}) {
  const c = request.ad_contracts;
  return (
    <div className="p-4 bg-surface border border-border rounded-xl">
      <div className="flex items-start gap-4">
        {c?.image_url && (
          <img
            src={c.image_url}
            alt=""
            className="size-20 rounded-lg object-cover shrink-0 border border-border"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{c?.title ?? "Contract"}</p>
            <span className="text-[10px] uppercase text-muted-foreground">· {c?.tier}</span>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c?.body_text}</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            By @{c?.advertiser_pi_username} · {c?.cost_pi} π · hash{" "}
            <span className="font-mono">{c?.contract_hash?.slice(0, 12)}…</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Venues: {request.ad_placements.map((p) => p.venue_name).join(", ")}
          </p>
        </div>
      </div>
      {request.status === "pending" && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button
            onClick={() => onDecide(request.id, "approved")}
            className="py-2 rounded-lg bg-success/10 border border-success/40 text-success text-xs font-semibold"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide(request.id, "changes_requested")}
            className="py-2 rounded-lg bg-warning/10 border border-warning/40 text-warning text-xs font-semibold"
          >
            Request changes
          </button>
          <button
            onClick={() => onDecide(request.id, "rejected")}
            className="py-2 rounded-lg bg-destructive/10 border border-destructive/40 text-destructive text-xs font-semibold"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
