import type { WalletCreditQrPayload } from '@/types/credits';
import type { CreditReservationQrPayload } from '@/types/creditReservation';

export type MemberScanKind = 'dni' | 'barcode';

export type ClassifiedMemberScan =
  | {
      scanKind: 'dni';
      raw: string;
      dni: string;
    }
  | {
      scanKind: 'barcode';
      raw: string;
      barcode: string;
    };

export type ParsedQrPayload =
  | {
      kind: 'wallet_credit_qr';
      payload: WalletCreditQrPayload;
      raw: string;
    }
  | {
      kind: 'credit_reservation_qr';
      payload: CreditReservationQrPayload;
      raw: string;
    }
  | ({
      kind: 'member_qr';
      raw: string;
    } & ClassifiedMemberScan)
  | {
      kind: 'unknown';
      raw: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Trim whitespace from scanned QR content. */
export function normalizeQrRaw(raw: string): string {
  return raw.trim();
}

/** Try JSON.parse on raw, then decodeURIComponent + JSON.parse. */
export function tryParseJson(raw: string): unknown | null {
  const trimmed = normalizeQrRaw(raw);

  if (trimmed.length === 0) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to URL-decoded parse.
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function parseWalletCreditQr(value: Record<string, unknown>): WalletCreditQrPayload | null {
  if (value.type !== 'wallet_credit_qr') {
    return null;
  }

  if (value.version !== 1) {
    return null;
  }

  if (typeof value.token !== 'string' || value.token.trim().length === 0) {
    return null;
  }

  return {
    type: 'wallet_credit_qr',
    version: 1,
    token: value.token.trim(),
  };
}

export function parseCreditReservationQr(
  value: Record<string, unknown>,
): CreditReservationQrPayload | null {
  if (value.type !== 'credit_reservation_qr') {
    return null;
  }

  if (value.version !== 1) {
    return null;
  }

  if (typeof value.token !== 'string' || value.token.trim().length === 0) {
    return null;
  }

  const reservationId =
    typeof value.reservation_id === 'number' && Number.isFinite(value.reservation_id)
      ? value.reservation_id
      : undefined;

  return {
    type: 'credit_reservation_qr',
    version: 1,
    token: value.token.trim(),
    ...(reservationId !== undefined ? { reservation_id: reservationId } : {}),
  };
}

/** "36.329.083" → "36329083" */
export function normalizeDni(value: string): string | null {
  const digits = value.replace(/[.\s-]/g, '');
  if (/^\d{7,8}$/.test(digits)) {
    return digits;
  }

  return null;
}

export function classifyMemberScan(raw: string): ClassifiedMemberScan | null {
  const trimmed = normalizeQrRaw(raw);
  const dni = normalizeDni(trimmed);

  if (dni) {
    return {
      scanKind: 'dni',
      raw: trimmed,
      dni,
    };
  }

  if (/^\d{9,}$/.test(trimmed)) {
    return {
      scanKind: 'barcode',
      raw: trimmed,
      barcode: trimmed,
    };
  }

  return null;
}

export function parseQrPayload(raw: string): ParsedQrPayload {
  const trimmed = normalizeQrRaw(raw);

  if (trimmed.length === 0) {
    return { kind: 'unknown', raw: trimmed };
  }

  const parsed = tryParseJson(trimmed);

  if (isRecord(parsed)) {
    const reservationPayload = parseCreditReservationQr(parsed);
    if (reservationPayload) {
      return {
        kind: 'credit_reservation_qr',
        payload: reservationPayload,
        raw: trimmed,
      };
    }

    const walletPayload = parseWalletCreditQr(parsed);
    if (walletPayload) {
      return {
        kind: 'wallet_credit_qr',
        payload: walletPayload,
        raw: trimmed,
      };
    }
  }

  const memberScan = classifyMemberScan(trimmed);
  if (memberScan) {
    return {
      kind: 'member_qr',
      ...memberScan,
    };
  }

  return { kind: 'unknown', raw: trimmed };
}

export type { WalletCreditQrPayload };
