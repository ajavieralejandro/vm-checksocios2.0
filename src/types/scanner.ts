export type ScanStatus =
  | 'allowed'
  | 'allowed_with_warning'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'already_used'
  | 'invalid'
  | 'error';

export type ScanResultType = 'member_access' | 'unknown';

export interface MemberPerson {
  name?: string;
  dni?: string;
}

export interface MemberAccessScanRequest {
  qr_payload: string;
  point: string;
}

export interface MemberAccessScanResponse {
  type: ScanResultType;
  status: ScanStatus;
  title: string;
  message: string;
  person?: MemberPerson | null;
  metadata?: Record<string, unknown>;
}
