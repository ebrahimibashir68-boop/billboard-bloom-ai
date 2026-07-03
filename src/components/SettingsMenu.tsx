import { useEffect, useState } from "react";
import { Settings, Monitor, Smartphone, Eye, Gauge, MoonStar, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Prefs = {
  desktopSite: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  compactDensity: boolean;
};

const DEFAULTS: Prefs = {
  desktopSite: false,
  reduceMotion: false,
  highContrast: false,
  compactDensity: false,
};

const STORAGE_KEY = "pi-billboard.appPrefs";

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

function applyPrefs(prefs: Prefs) {
  if (typeof document === "undefined") return;
  // Desktop site: force a wide viewport so mobile browsers render the desktop layout.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (meta) {
    meta.content = prefs.desktopSite
      ? "width=1280, initial-scale=1, user-scalable=yes"
      : "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes";
  }
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", prefs.reduceMotion);
  root.classList.toggle("high-contrast", prefs.highContrast);
  root.classList.toggle("compact-density", prefs.compactDensity);
}

export function SettingsMenu() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyPrefs(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota */
    }
    applyPrefs(prefs);
  }, [prefs, ready]);

  const toggle = (key: keyof Prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items: {
    key: keyof Prefs;
    label: string;
    hint: string;
    icon: typeof Monitor;
  }[] = [
    {
      key: "desktopSite",
      label: "Desktop site",
      hint: "Render the full desktop layout on mobile",
      icon: prefs.desktopSite ? Monitor : Smartphone,
    },
    {
      key: "compactDensity",
      label: "Compact density",
      hint: "Tighter spacing across panels",
      icon: Gauge,
    },
    {
      key: "highContrast",
      label: "High contrast",
      hint: "Boost readability on bright venues",
      icon: Eye,
    },
    {
      key: "reduceMotion",
      label: "Reduce motion",
      hint: "Minimize animations and pulses",
      icon: MoonStar,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="size-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          aria-label="Application settings"
          title="Settings"
        >
          <Settings className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        className="w-72 p-2 bg-surface border border-border"
      >
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            App Settings
          </p>
        </div>
        <div className="flex flex-col">
          {items.map(({ key, label, hint, icon: Icon }) => {
            const active = prefs[key];
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className="flex items-start gap-3 px-2 py-2.5 rounded-md hover:bg-surface-elevated text-left transition"
                role="switch"
                aria-checked={active}
              >
                <div
                  className={`size-8 rounded-md flex items-center justify-center shrink-0 border ${
                    active
                      ? "bg-brand/15 border-brand/40 text-brand"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {hint}
                  </p>
                </div>
                <div
                  className={`mt-1 size-4 rounded-full border flex items-center justify-center shrink-0 ${
                    active ? "bg-brand border-brand text-brand-foreground" : "border-border"
                  }`}
                >
                  {active && <Check className="size-3" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-1 border-t border-border pt-2 px-2 pb-1">
          <p className="text-[10px] text-muted-foreground">
            Preferences are saved on this device.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
