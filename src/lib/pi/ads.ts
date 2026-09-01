// Pi Ads Network helper — wraps the Pi SDK Ads surface.
// Handles native-feature detection, pre-loads rewarded ads, and (for rewarded
// ads) verifies the reward with the Pi Ads Network server-side before the app
// grants anything of value.
import type { PiAdType, PiSDK, PiShowAdResponse } from "./types";

export type ShowAdOutcome =
  | { ok: true; type: PiAdType; rewarded: boolean; verified: boolean; adId?: string }
  | { ok: false; reason: "unsupported" | "unavailable" | "network" | "display_error" | "closed" };

function getPi(): PiSDK | null {
  if (typeof window === "undefined") return null;
  return window.Pi ?? null;
}

export async function isAdsSupported(): Promise<boolean> {
  const Pi = getPi();
  if (!Pi) return false;
  try {
    if (!Pi.Ads || typeof Pi.nativeFeaturesList !== "function") return false;
    const features = await Pi.nativeFeaturesList();
    return features.includes("ad_network");
  } catch {
    return false;
  }
}

/** Server-side reward verification. Returns false when it cannot be confirmed. */
async function verifyReward(adId: string, accessToken?: string): Promise<boolean> {
  try {
    const res = await fetch("/api/public/pi-ad-reward", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ adId }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { verified?: boolean };
    return data.verified === true;
  } catch {
    return false;
  }
}

export async function showPiAd(
  adType: PiAdType,
  options: { accessToken?: string } = {},
): Promise<ShowAdOutcome> {
  const Pi = getPi();
  if (!Pi || !(await isAdsSupported())) return { ok: false, reason: "unsupported" };
  const ads = Pi.Ads!;

  // Interstitial ads can be shown directly; rewarded ads must be pre-loaded.
  if (adType === "rewarded") {
    const ready = await ads.isAdReady("rewarded");
    if (!ready.ready) {
      const req = await ads.requestAd("rewarded");
      if (req.result !== "AD_LOADED") {
        return {
          ok: false,
          reason: req.result === "AD_NOT_AVAILABLE" ? "unavailable" : "network",
        };
      }
    }
  }

  let res: PiShowAdResponse;
  try {
    res = await ads.showAd(adType);
  } catch {
    return { ok: false, reason: "display_error" };
  }

  switch (res.result) {
    case "AD_REWARDED": {
      const verified = res.adId ? await verifyReward(res.adId, options.accessToken) : false;
      return { ok: true, type: adType, rewarded: true, verified, adId: res.adId };
    }
    case "AD_CLOSED":
      return { ok: true, type: adType, rewarded: false, verified: false, adId: res.adId };
    case "AD_NOT_AVAILABLE":
      return { ok: false, reason: "unavailable" };
    case "AD_NETWORK_ERROR":
      return { ok: false, reason: "network" };
    case "AD_DISPLAY_ERROR":
    default:
      return { ok: false, reason: "display_error" };
  }
}
