// Pi Network SDK types — official surface from https://github.com/pi-apps/pi-platform-docs
export type PiScope = "username" | "payments" | "wallet_address";

export interface PiAuthResult {
  accessToken: string;
  user: { uid: string; username: string };
}

export interface PiPaymentDTO {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  to_address: string;
  created_at: string;
  network: "Pi Network" | "Pi Testnet";
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | { txid: string; verified: boolean; _link: string };
}

export interface PiPaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

export interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PiPaymentDTO) => void;
}

export type PiAdType = "interstitial" | "rewarded";

export interface PiShowAdResponse {
  type: PiAdType;
  result: "AD_CLOSED" | "AD_REWARDED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE";
  adId?: string;
}

export interface PiIsAdReadyResponse {
  type: PiAdType;
  ready: boolean;
}

export interface PiRequestAdResponse {
  type: PiAdType;
  result: "AD_LOADED" | "AD_FAILED_TO_LOAD" | "AD_NOT_AVAILABLE";
}

export interface PiNativeFeaturesList extends Array<string> {}

export interface PiAdsAPI {
  showAd: (adType: PiAdType) => Promise<PiShowAdResponse>;
  isAdReady: (adType: PiAdType) => Promise<PiIsAdReadyResponse>;
  requestAd: (adType: PiAdType) => Promise<PiRequestAdResponse>;
}

export interface PiSDK {
  init: (config: { version: "2.0"; sandbox?: boolean }) => Promise<void> | void;
  authenticate: (
    scopes: PiScope[],
    onIncompletePaymentFound: (payment: PiPaymentDTO) => void,
  ) => Promise<PiAuthResult>;
  createPayment: (
    payment: PiPaymentData,
    callbacks: PiPaymentCallbacks,
  ) => Promise<PiPaymentDTO>;
  // Native feature detection — required before calling Ads on older Pi Browsers.
  nativeFeaturesList: () => Promise<PiNativeFeaturesList>;
  Ads?: PiAdsAPI;
}


declare global {
  interface Window {
    Pi?: PiSDK;
  }
}
