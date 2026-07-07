import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Type, Image as ImageIcon, Film, Save, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { usePi } from "@/lib/pi/usePi";

type Kind = "text" | "image" | "video";
type Aspect = "16:9" | "9:16" | "1:1";

export const Route = createFileRoute("/studio-design")({
  head: () => ({
    meta: [
      { title: "Design Studio · Pi Billboard" },
      {
        name: "description",
        content:
          "Design text, image, and video billboard creatives for global venues — save reusable creatives and attach them to smart contracts.",
      },
    ],
  }),
  component: StudioDesignPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function StudioDesignPage() {
  return (
    <AppShell>
      <TopBar />
      <Studio />
    </AppShell>
  );
}

function Studio() {
  const { authenticate, status } = usePi();
  const [kind, setKind] = useState<Kind>("text");
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [name, setName] = useState("Untitled creative");

  // Shared
  const [headline, setHeadline] = useState("YOUR HEADLINE");
  const [subline, setSubline] = useState("A short line that sells it.");
  const [textColor, setTextColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#0F172A");
  const [accentColor, setAccentColor] = useState("#3B82F6");
  const [font, setFont] = useState("Inter");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");

  // Image
  const [imageUrl, setImageUrl] = useState("");
  const [overlayText, setOverlayText] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Video
  const [videoUrl, setVideoUrl] = useState("");
  const [durationSec, setDurationSec] = useState(8);

  const [saving, setSaving] = useState(false);

  const aspectStyle = useMemo(() => {
    const ratios = { "16:9": "aspect-video", "9:16": "aspect-[9/16]", "1:1": "aspect-square" };
    return ratios[aspect];
  }, [aspect]);

  const spec = useMemo(
    () => ({
      kind,
      aspect,
      headline,
      subline,
      textColor,
      bgColor,
      accentColor,
      font,
      align,
      imageUrl: kind === "image" ? imageUrl : undefined,
      overlayText: kind === "image" ? overlayText : undefined,
      videoUrl: kind === "video" ? videoUrl : undefined,
      durationSec: kind === "video" ? durationSec : undefined,
    }),
    [
      kind,
      aspect,
      headline,
      subline,
      textColor,
      bgColor,
      accentColor,
      font,
      align,
      imageUrl,
      overlayText,
      videoUrl,
      durationSec,
    ],
  );

  const generateImage = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-billboard-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${headline}. ${subline}. Billboard advertising art, cinematic, high contrast.` }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error || "No image returned");
      setImageUrl(data.url);
      toast.success("AI billboard generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveCreative = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const auth = await authenticate();
      const res = await fetch("/api/public/pi-creatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          kind,
          name: name.trim(),
          spec,
          preview_url: kind === "image" ? imageUrl || undefined : undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Creative saved", { description: "Attach it from Smart Contracts to publish." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Design Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compose text, image, and video billboards. AI helps you generate imagery, then save a
            creative to attach to a smart contract.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { k: "text" as Kind, icon: Type, label: "Text" },
              { k: "image" as Kind, icon: ImageIcon, label: "Image" },
              { k: "video" as Kind, icon: Film, label: "Video" },
            ]
          ).map(({ k, icon: Icon, label }) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs transition ${
                kind === k
                  ? "bg-brand/10 border-brand/40 text-brand"
                  : "bg-surface-elevated border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <Field label="Creative name">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </Field>

        <Field label="Aspect ratio">
          <div className="grid grid-cols-3 gap-2">
            {(["16:9", "9:16", "1:1"] as Aspect[]).map((a) => (
              <button
                key={a}
                onClick={() => setAspect(a)}
                className={`p-2 rounded-lg border text-xs ${
                  aspect === a
                    ? "bg-brand/10 border-brand/40 text-brand"
                    : "bg-surface-elevated border-border text-muted-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Headline">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={80}
          />
        </Field>
        <Field label="Subline">
          <input
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={subline}
            onChange={(e) => setSubline(e.target.value)}
            maxLength={160}
          />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Text">
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-10 rounded-lg bg-background border border-border" />
          </Field>
          <Field label="Background">
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full h-10 rounded-lg bg-background border border-border" />
          </Field>
          <Field label="Accent">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-full h-10 rounded-lg bg-background border border-border" />
          </Field>
        </div>

        <Field label="Font">
          <select
            className="w-full p-3 bg-background border border-border rounded-xl text-sm"
            value={font}
            onChange={(e) => setFont(e.target.value)}
          >
            {["Inter", "Space Grotesk", "Playfair Display", "JetBrains Mono"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>

        <Field label="Alignment">
          <div className="grid grid-cols-3 gap-2">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAlign(a)}
                className={`p-2 rounded-lg border text-xs capitalize ${
                  align === a
                    ? "bg-brand/10 border-brand/40 text-brand"
                    : "bg-surface-elevated border-border text-muted-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>

        {kind === "image" && (
          <>
            <Field label="Image URL">
              <input
                className="w-full p-3 bg-background border border-border rounded-xl text-sm"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={overlayText}
                onChange={(e) => setOverlayText(e.target.checked)}
              />
              Overlay headline + subline
            </label>
            <button
              onClick={generateImage}
              disabled={generating}
              className="w-full py-2 rounded-xl border border-brand/40 bg-brand/10 text-brand text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </>
        )}

        {kind === "video" && (
          <>
            <Field label="Video URL (mp4 or hls)">
              <input
                className="w-full p-3 bg-background border border-border rounded-xl text-sm"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://…/spot.mp4"
              />
            </Field>
            <Field label={`Loop duration · ${durationSec}s`}>
              <input
                type="range"
                min={4}
                max={30}
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value, 10))}
                className="w-full accent-brand"
              />
            </Field>
          </>
        )}

        <button
          onClick={saveCreative}
          disabled={saving || status !== "ready"}
          className="w-full py-3 bg-brand text-brand-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="size-4" />
          {saving ? "Saving…" : "Save creative"}
        </button>
        {status !== "ready" && (
          <p className="text-[11px] text-muted-foreground text-center">
            Open in Pi Browser to save creatives.
          </p>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Live preview
        </p>
        <div className="max-w-3xl mx-auto w-full">
          <div
            className={`${aspectStyle} w-full rounded-2xl overflow-hidden ring-1 ring-border relative`}
            style={{ background: bgColor }}
          >
            {kind === "image" && imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            {kind === "video" && videoUrl && (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {(kind !== "image" || overlayText) && (
              <div
                className={`absolute inset-0 p-8 md:p-12 flex flex-col justify-end ${
                  align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left"
                }`}
                style={{ color: textColor, fontFamily: font }}
              >
                {kind === "image" && overlayText && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                )}
                <div className="relative">
                  <div
                    className="inline-block w-10 h-1 rounded-full mb-4"
                    style={{ background: accentColor }}
                  />
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">{headline}</h2>
                  <p className="mt-2 text-sm md:text-lg opacity-80">{subline}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <pre className="mt-4 p-3 bg-surface-elevated border border-border rounded-xl text-[10px] max-h-40 overflow-auto text-muted-foreground">
{JSON.stringify(spec, null, 2)}
        </pre>
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
