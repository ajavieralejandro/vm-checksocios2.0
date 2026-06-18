export type CreditsErrorCode =
  | 'invalid_qr'
  | 'expired_qr'
  | 'inactive_qr'
  | 'wallet_not_found'
  | 'insufficient_balance'
  | 'scanner_unauthorized'
  | 'network_error'
  | 'unknown_error';

export type WalletCreditQrPayload = {
  type: 'wallet_credit_qr';
  version: number;
  token: string;
};

export type CreditsPreviewData = {
  memberName?: string;
  balance?: number;
  amount: number;
  canConsume: boolean;
  reason?: string;
  reasonCode?: CreditsErrorCode;
};

export type CreditsPreviewResult =
  | { ok: true; data: CreditsPreviewData }
  | { ok: false; errorCode: CreditsErrorCode; message: string };

export type CreditsConsumeData = {
  approved: boolean;
  transactionId?: string;
  newBalance?: number;
  reason?: string;
  reasonCode?: CreditsErrorCode;
};

export type CreditsConsumeResult =
  | { ok: true; data: CreditsConsumeData }
  | { ok: false; errorCode: CreditsErrorCode; message: string };

export type CreditsFlowPhase =
  | 'idle'
  | 'scanning'
  | 'parsing'
  | 'validating'
  | 'preview'
  | 'consuming'
  | 'approved'
  | 'rejected'
  | 'error';
