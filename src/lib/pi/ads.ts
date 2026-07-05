// Pi Ads helper — wraps the Pi SDK Ads surface documented in ads.md.
// Handles native-feature detection, retries a request when the ad isn't ready,
// and returns a normalized outcome so callers don't need to know SDK internals.
import type { PiAdType, PiSDK, PiShowAdResponse } from "./types";

export type ShowAdOutcome =
  | { ok: true; type: PiAdType; rewarded: boolean; adId?: string }
  | { ok: false; reason: "unsupported" | "unavailable" | "network" | "display_error" | "closed" };

function getPi(): PiSDK | null {
  if (typeof window === "undefined") return null;
  return window.Pi ?? null;
}

async function isAdsSupported(Pi: PiSDK): Promise<boolean> {
  try {
    if (!Pi.Ads || typeof Pi.nativeFeaturesList !== "function") return false;
    const features = await Pi.nativeFeaturesList();
    return features.includes("ad_network");
  } catch {
    return false;
  }
}

export async function showPiAd(adType: PiAdType): Promise<ShowAdOutcome> {
  const Pi = getPi();
  if (!Pi) return { ok: false, reason: "unsupported" };
  if (!(await isAdsSupported(Pi))) return { ok: false, reason: "unsupported" };
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
    case "AD_REWARDED":
      return { ok: true, type: adType, rewarded: true, adId: res.adId };
    case "AD_CLOSED":
      return { ok: true, type: adType, rewarded: false, adId: res.adId };
    case "AD_NOT_AVAILABLE":
      return { ok: false, reason: "unavailable" };
    case "AD_NETWORK_ERROR":
      return { ok: false, reason: "network" };
    case "AD_DISPLAY_ERROR":
    default:
      return { ok: false, reason: "display_error" };
  }
}
