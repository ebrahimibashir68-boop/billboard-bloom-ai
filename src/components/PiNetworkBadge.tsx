import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

interface PiNetworkStatus {
  reachable: boolean;
  currentProtocol: number | null;
  protocolReady: boolean;
}

async function fetchStatus(): Promise<PiNetworkStatus> {
  const res = await fetch("/api/public/pi-network-status");
  if (!res.ok) throw new Error("status unavailable");
  return (await res.json()) as PiNetworkStatus;
}

/** Live Pi Mainnet protocol badge — confirms the chain runs Protocol 27+. */
export function PiNetworkBadge() {
  const { data } = useQuery({
    queryKey: ["pi-network-status"],
    queryFn: fetchStatus,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (!data?.reachable) return null;

  const ready = data.protocolReady;
  return (
    <div
      className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${
        ready
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning"
      }`}
      title={
        ready
          ? `Pi Mainnet is live on Protocol ${data.currentProtocol} — the app is compatible.`
          : `Pi Mainnet reports Protocol ${data.currentProtocol ?? "?"} — below the version this app targets.`
      }
    >
      <Activity className="size-3" />
      Pi Mainnet · P{data.currentProtocol ?? "?"}
    </div>
  );
}
