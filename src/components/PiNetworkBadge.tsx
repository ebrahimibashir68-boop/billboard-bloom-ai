import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import type { PiNetworkStatus } from "@/lib/pi/network";

async function fetchStatus(): Promise<PiNetworkStatus> {
  const res = await fetch("/api/public/pi-network-status");
  if (!res.ok) throw new Error("status unavailable");
  return (await res.json()) as PiNetworkStatus;
}

/** Report observed Mainnet protocol, without claiming payment verification. */
export function PiNetworkBadge() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["pi-network-status"],
    queryFn: fetchStatus,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const reachable = Boolean(data?.reachable) && !isError;
  const ready = reachable && Boolean(data?.protocolReady) && Boolean(data?.targetReached);
  return (
    <div
      role="status"
      aria-label="Pi Mainnet network status"
      className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${
        ready
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning"
      }`}
      title={
        !reachable
          ? "Pi Mainnet status could not be confirmed."
          : ready
            ? `Pi Mainnet reports Protocol ${data?.currentProtocol}. Latest monitored target: ${data?.targetProtocol}.`
            : `Pi Mainnet reports Protocol ${data?.currentProtocol ?? "?"}; monitored target: ${data?.targetProtocol}.`
      }
    >
      <Activity className="size-3" />
      Pi Mainnet · {isPending ? "Checking" : reachable ? `P${data?.currentProtocol}` : "Unconfirmed"}
    </div>
  );
}
