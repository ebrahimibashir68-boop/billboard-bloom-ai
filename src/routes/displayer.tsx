import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Radio, Copy, Plus, Trash2, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/displayer")({
  head: () => ({
    meta: [
      { title: "Displayer Console · Pi Billboard" },
      { name: "description", content: "Register your billboard screen, pull the live playlist over HTTP, and earn π per verified play." },
    ],
  }),
  component: DisplayerPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

interface Screen {
  id: string;
  name: string;
  device_key: string;
  status: string;
  orientation: string;
  resolution: string | null;
  location_id: string | null;
  last_ping_at: string | null;
  billboard_locations: { name: string; city: string; country: string } | null;
}

interface Location { id: string; name: string; city: string; country: string; }

function DisplayerPage() {
  const { user, authenticate } = usePi();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [stats, setStats] = useState({ earnings_pi: 0, plays: 0 });
  const [locations, setLocations] = useState<Location[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", location_id: "", orientation: "landscape", resolution: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const token = await getPiToken();
    if (!token) return;
    const res = await fetch("/api/public/pi-screens", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const j = (await res.json()) as { screens: Screen[]; stats: { earnings_pi: number; plays: number } };
      setScreens(j.screens);
      setStats(j.stats);
    }
  }, [user]);

  useEffect(() => {
    supabase.from("billboard_locations").select("id, name, city, country").eq("active", true).order("name").then(({ data }) => {
      setLocations((data ?? []) as Location[]);
    });
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function getPiToken(): Promise<string | null> {
    try {
      const result = await authenticate(["username"]);
      return (result as { accessToken?: string }).accessToken ?? null;
    } catch { return null; }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const token = await getPiToken();
      if (!token) { toast.error("Sign in with Pi first"); return; }
      const res = await fetch("/api/public/pi-screens", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, location_id: form.location_id || null, resolution: form.resolution || null }),
      });
      if (!res.ok) { toast.error("Could not register screen"); return; }
      toast.success("Screen registered");
      setForm({ name: "", location_id: "", orientation: "landscape", resolution: "" });
      await load();
    } finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    const token = await getPiToken();
    if (!token) return;
    await fetch(`/api/public/pi-screens?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    await load();
  }

  return (
    <AppShell>
      <TopBar />
      <div className="p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
        <header>
          <div className="inline-flex items-center gap-2 text-xs text-brand font-mono uppercase tracking-widest mb-2">
            <Radio className="size-3.5" /> Displayer console
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">Operate a physical billboard</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Register your screen, receive a device key, and have your player poll the playlist endpoint. Every acknowledged play mints an entry on the public ledger and shares π with your wallet.</p>
        </header>

        {!user && (
          <div className="p-4 rounded-lg border border-brand/40 bg-brand/5 text-sm">
            Sign in with Pi to register and manage screens.
          </div>
        )}

        {user && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border bg-surface"><div className="text-xs text-muted-foreground">Total plays</div><div className="text-2xl font-mono mt-1">{stats.plays.toLocaleString()}</div></div>
              <div className="p-4 rounded-xl border border-border bg-surface"><div className="text-xs text-muted-foreground">Attributed revenue (all locations)</div><div className="text-2xl font-mono mt-1 text-brand">π {stats.earnings_pi.toFixed(2)}</div></div>
            </div>

            <form onSubmit={handleCreate} className="p-5 rounded-xl border border-border bg-surface space-y-3">
              <h3 className="font-medium flex items-center gap-2"><Plus className="size-4" /> Register a screen</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input required placeholder="Screen name (e.g. Lobby Wall #1)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
                <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
                  <option value="">— Independent screen —</option>
                  {locations.map((l) => (<option key={l.id} value={l.id}>{l.name} · {l.city}</option>))}
                </select>
                <select value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                  <option value="square">Square</option>
                </select>
                <input placeholder="Resolution (1920x1080)" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} className="px-3 py-2 rounded-lg bg-background border border-border text-sm" />
              </div>
              <button disabled={creating} type="submit" className="px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium disabled:opacity-50">
                {creating ? "Registering…" : "Register screen"}
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="font-medium">My screens ({screens.length})</h3>
              {screens.map((s) => {
                const playlistUrl = `${window.location.origin}/api/public/screen-playlist?device_key=${s.device_key}`;
                return (
                  <div key={s.id} className="p-4 rounded-xl border border-border bg-surface space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.billboard_locations ? `${s.billboard_locations.name} · ${s.billboard_locations.city}` : "Independent"} · {s.orientation} · {s.resolution ?? "—"}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(s.id)} className="text-destructive hover:opacity-80" aria-label="Delete"><Trash2 className="size-4" /></button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${s.last_ping_at && Date.now() - new Date(s.last_ping_at).getTime() < 60_000 ? "bg-green-500" : "bg-muted-foreground"}`} />
                        <span className="text-muted-foreground">{s.last_ping_at ? `Last ping ${new Date(s.last_ping_at).toLocaleTimeString()}` : "Never pinged"}</span>
                      </div>
                      <div className="p-2 rounded bg-background border border-border font-mono text-[11px] flex items-center gap-2 group">
                        <code className="flex-1 truncate">{playlistUrl}</code>
                        <button onClick={() => { navigator.clipboard.writeText(playlistUrl); toast.success("Copied"); }} className="opacity-60 hover:opacity-100"><Copy className="size-3.5" /></button>
                        <a href={playlistUrl} target="_blank" rel="noopener" className="opacity-60 hover:opacity-100"><ExternalLink className="size-3.5" /></a>
                      </div>
                      <details className="text-muted-foreground">
                        <summary className="cursor-pointer">Report a play (POST)</summary>
                        <pre className="mt-2 p-2 rounded bg-background border border-border overflow-auto text-[11px]">{`curl -X POST ${window.location.origin}/api/public/screen-playlist \\
  -H "Content-Type: application/json" \\
  -d '{"device_key":"${s.device_key}","kind":"play","booking_id":"<uuid>","impressions":1}'`}</pre>
                      </details>
                    </div>
                  </div>
                );
              })}
              {screens.length === 0 && <div className="text-sm text-muted-foreground">No screens yet.</div>}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
