import { Link, useRouterState } from "@tanstack/react-router";
import { Globe2, Sparkles, Megaphone, BarChart3, Bot, FileCheck2, Palette, Building2, FileText, MapPin, Receipt, Store, Radio, Blocks, Wand2, Gauge, Wallet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SettingsMenu } from "./SettingsMenu";
import { ScrollControls } from "./ScrollControls";
import { AssistantDock } from "./AssistantDock";
import { PiAuthGate } from "./PiAuthGate";
import { PiComplianceFooter } from "./PiComplianceFooter";



type NavItem = { to: string; label: string; icon: LucideIcon };

// Grouped by the role that uses it, mirroring how the out-of-home industry
// splits buyers (advertisers/agencies), media owners and screen operators.
const navGroups: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "network",
    label: "Network",
    items: [
      { to: "/", label: "Global Network", icon: Globe2 },
      { to: "/marketplace", label: "Marketplace", icon: Store },
      { to: "/locations", label: "Billboards", icon: MapPin },
      { to: "/cities", label: "Cities", icon: Building2 },
    ],
  },
  {
    id: "buy",
    label: "Buy side",
    items: [
      { to: "/bookings", label: "Bookings", icon: Receipt },
      { to: "/rfps", label: "RFP Marketplace", icon: FileText },
      { to: "/contracts", label: "Smart Contracts", icon: FileCheck2 },
      { to: "/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    id: "create",
    label: "Creative",
    items: [
      { to: "/studio-design", label: "Design Studio", icon: Palette },
      { to: "/studio", label: "AI Creative", icon: Sparkles },
      { to: "/optimize", label: "AI Optimizer", icon: Wand2 },
    ],
  },
  {
    id: "sell",
    label: "Sell side",
    items: [
      { to: "/partner", label: "Partner Console", icon: Building2 },
      { to: "/displayer", label: "Displayer Console", icon: Radio },
      { to: "/payouts", label: "Pi Payouts", icon: Wallet },
    ],
  },
  {
    id: "measure",
    label: "Measurement",
    items: [
      { to: "/measurement", label: "Delivery & Impressions", icon: Gauge },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/ledger", label: "On-chain Ledger", icon: Blocks },
      { to: "/innovate", label: "Innovation Bot", icon: Bot },
    ],
  },
];



export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <nav className="w-16 flex flex-col items-center py-6 border-r border-border bg-background gap-8 shrink-0 sticky top-0 h-screen">
        <Link to="/" aria-label="Pi Billboard home" className="size-10 rounded-xl bg-brand flex items-center justify-center shadow-[0_0_24px_-4px_var(--color-brand)]">
          <div className="size-6 border-2 border-background rounded-full flex items-center justify-center font-bold text-brand-foreground text-xs">π</div>
        </Link>

        <div className="flex flex-col gap-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2 items-center">
              <span className="text-[8px] uppercase tracking-widest text-muted-foreground/70">
                {group.label.slice(0, 4)}
              </span>
              {group.items.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    aria-label={label}
                    title={`${group.label} — ${label}`}
                    className={`size-10 rounded-lg flex items-center justify-center transition-colors ${
                      active
                        ? "bg-surface-elevated text-brand"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface"
                    }`}
                  >
                    <Icon className="size-4" />
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-4 items-center">
          <SettingsMenu />
          <div className="size-8 rounded-full bg-surface border border-border" />
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative min-w-0">
        <PiAuthGate>
          {children}
          <PiComplianceFooter />
        </PiAuthGate>
      </main>
      <ScrollControls />
      <AssistantDock />
    </div>
  );
}


