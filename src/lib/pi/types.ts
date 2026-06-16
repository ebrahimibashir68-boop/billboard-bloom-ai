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
}

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}
