import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";

export const Route = createFileRoute("/admin/partners")({
  head: () => ({
    meta: [{ title: "Admin · Partner Applications · Pi Billboard" }],
  }),
  component: AdminPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface Partner {
  id: string;
  company_name: string;
  contact_email: string;
  country: string;
  website: string | null;
  billboards_summary: string | null;
  status: string;
  created_at: string;
}

function AdminPage() {
  return (
    <AppShell>
      <TopBar title="Admin" />
      <AdminConsole />
    </AppShell>
  );
}

function AdminConsole() {
  const { authenticate, status } = usePi();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-partners?mode=admin", {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = (await res.json()) as { partners?: Partner[]; is_admin?: boolean };
      setIsAdmin(!!data.is_admin);
      setPartners(data.partners ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [authenticate]);

  useEffect(() => {
    if (status === "ready") load();
  }, [status, load]);

  const decide = async (id: string, s: "approved" | "rejected" | "suspended") => {
    const auth = await authenticate();
    const res = await fetch("/api/public/pi-partners?action=admin-decide-partner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({ partner_id: id, status: s }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success(`Set ${s}`);
    load();
  };

  if (status !== "ready") return <div className="p-8">Open in Pi Browser.</div>;
  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Admin access required. Ask an operator to add your Pi UID to <code>ADMIN_PI_UIDS</code>.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-brand" />
        <h1 className="text-2xl font-bold">Partner Applications</h1>
      </div>

      <div className="grid gap-3">
        {partners.map((p) => (
          <div key={p.id} className="p-4 bg-surface border border-border rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">{p.company_name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.contact_email} · {p.country}
                  {p.website && (
                    <>
                      {" · "}
                      <a href={p.website} target="_blank" rel="noreferrer" className="text-brand">
                        {p.website}
                      </a>
                    </>
                  )}
                </p>
                {p.billboards_summary && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.billboards_summary}</p>
                )}
              </div>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-border">
                {p.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => decide(p.id, "approved")}
                className="py-1.5 rounded-lg bg-success/10 border border-success/40 text-success text-xs font-semibold"
              >
                Approve
              </button>
              <button
                onClick={() => decide(p.id, "suspended")}
                className="py-1.5 rounded-lg bg-warning/10 border border-warning/40 text-warning text-xs font-semibold"
              >
                Suspend
              </button>
              <button
                onClick={() => decide(p.id, "rejected")}
                className="py-1.5 rounded-lg bg-destructive/10 border border-destructive/40 text-destructive text-xs font-semibold"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {partners.length === 0 && (
          <p className="text-sm text-muted-foreground">No partner applications yet.</p>
        )}
      </div>
    </div>
  );
}
