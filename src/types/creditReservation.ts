export type CreditReservationErrorCode =
  | 'reservation_not_found'
  | 'already_checked_in'
  | 'invalid_qr'
  | 'expired_qr'
  | 'scanner_unauthorized'
  | 'network_error'
  | 'unknown_error';

export type CreditReservationQrPayload = {
  type: 'credit_reservation_qr';
  version: 1;
  token: string;
  reservation_id?: number;
};

export type CreditReservationPreviewData = {
  memberName?: string;
  activity?: string;
  scheduledAt?: string;
  creditsUsed?: number;
  status?: string;
  canCheckIn: boolean;
  reason?: string;
  reasonCode?: CreditReservationErrorCode;
};

export type CreditReservationPreviewResult =
  | { ok: true; data: CreditReservationPreviewData }
  | { ok: false; errorCode: CreditReservationErrorCode; message: string };

export type CreditReservationCheckInData = {
  checkedIn: boolean;
  reservationId?: number;
  status?: string;
  reason?: string;
  reasonCode?: CreditReservationErrorCode;
};

export type CreditReservationCheckInResult =
  | { ok: true; data: CreditReservationCheckInData }
  | { ok: false; errorCode: CreditReservationErrorCode; message: string };

export type CreditReservationFlowPhase =
  | 'preview'
  | 'checking_in'
  | 'checked_in'
  | 'rejected'
  | 'error';
