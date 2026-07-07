import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";

export const Route = createFileRoute("/partners/register")({
  head: () => ({
    meta: [
      { title: "Register as a Billboard Partner · Pi Billboard" },
      {
        name: "description",
        content:
          "Real billboard operators can register their venues with Pi Billboard to receive and review AI-distributed ad contracts.",
      },
    ],
  }),
  component: RegisterPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function RegisterPage() {
  return (
    <AppShell>
      <TopBar />
      <RegisterForm />
    </AppShell>
  );
}

function RegisterForm() {
  const { authenticate, status } = usePi();
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!company.trim() || !email.trim() || !country.trim()) return;
    setBusy(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-partners?action=register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          company_name: company.trim(),
          contact_email: email.trim(),
          country: country.trim(),
          website: website.trim() || undefined,
          billboards_summary: summary.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Registration failed");
      toast.success("Partner application submitted", {
        description: "You'll be notified once approved by our team.",
      });
      navigate({ to: "/partner" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-xl bg-brand/10 border border-brand/40 flex items-center justify-center">
          <Building2 className="size-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Register as a Billboard Partner</h1>
          <p className="text-sm text-muted-foreground">
            Own or operate billboards in stadiums, arenas, racetracks or esports venues? Join the
            network to receive AI-matched ad contracts.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-6 p-6 bg-surface border border-border rounded-2xl">
        <Field label="Company name">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            maxLength={120}
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Country / region">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={80}
          />
        </Field>
        <Field label="Website (optional)">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            maxLength={300}
          />
        </Field>
        <Field label="Billboards summary (venues, cities, screen types)">
          <textarea
            rows={4}
            className="w-full p-3 bg-background border border-border rounded-xl text-sm resize-none"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={1000}
          />
        </Field>

        <button
          onClick={submit}
          disabled={busy || status !== "ready" || !company.trim() || !email.trim() || !country.trim()}
          className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit application"}
          <ArrowRight className="size-4" />
        </button>
        {status !== "ready" && (
          <p className="text-[11px] text-muted-foreground text-center">
            Open in Pi Browser to sign in with your Pi identity.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground text-center">
          Already registered?{" "}
          <Link to="/partner" className="text-brand underline underline-offset-2">
            Open partner console
          </Link>
        </p>
      </div>
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
