import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthorizationDetails {
  client?: { name?: string; client_name?: string; redirect_uri?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
}

// The supabase.auth.oauth namespace is beta; wrap the three methods we use.
const oauth = (
  supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (
        id: string,
      ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
      approveAuthorization: (
        id: string,
      ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
      denyAuthorization: (
        id: string,
      ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
    };
  }
).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: ({ search }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return { signedIn: false, details: null };

    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return { signedIn: true, details: data };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-lg font-semibold mb-2">Could not load this authorization request</h1>
      <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const { signedIn, details } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an app";

  async function signIn(provider: "google") {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href },
    });
    if (e) {
      setBusy(false);
      setError(e.message);
    }
  }

  async function sendLink(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);
    if (e) setError(e.message);
    else setSent(true);
  }

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: e } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (e) {
      setBusy(false);
      setError(e.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (!signedIn) {
    return (
      <main className="p-8 max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Pi Billboard account to review this connection request.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void signIn("google")}
          className="w-full px-4 py-2 rounded-lg border border-border hover:bg-surface disabled:opacity-50"
        >
          Continue with Google
        </button>
        {sent ? (
          <p className="text-sm text-muted-foreground">Check your email for a sign-in link.</p>
        ) : (
          <form onSubmit={sendLink} className="space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2 rounded-lg border border-border hover:bg-surface disabled:opacity-50"
            >
              Email me a sign-in link
            </button>
          </form>
        )}
      </main>
    );
  }

  return (
    <main className="p-8 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Connect {clientName} to Pi Billboard</h1>
      <p className="text-sm text-muted-foreground">
        {clientName} will be able to call this app&apos;s enabled tools while you are signed in.
      </p>
      {details?.client?.redirect_uri && (
        <p className="text-xs font-mono break-all text-muted-foreground">
          Redirects to {details.client.redirect_uri}
        </p>
      )}
      {details?.scope && (
        <p className="text-xs text-muted-foreground">Requested access: {details.scope}</p>
      )}
      <p className="text-xs text-muted-foreground">
        This does not bypass this app&apos;s permissions or backend policies.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide(true)}
          className="px-4 py-2 rounded-lg bg-brand text-brand-foreground disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide(false)}
          className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
        >
          Cancel connection
        </button>
      </div>
    </main>
  );
}
