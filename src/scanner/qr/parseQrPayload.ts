import type { WalletCreditQrPayload } from '@/types/credits';

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

function parseWalletCreditQr(value: Record<string, unknown>): WalletCreditQrPayload | null {
  if (value.type !== 'wallet_credit_qr') {
    return null;
  }

  if (typeof value.token !== 'string' || value.token.trim().length === 0) {
    return null;
  }

  const version =
    typeof value.version === 'number' && Number.isFinite(value.version)
      ? value.version
      : 1;

  return {
    type: 'wallet_credit_qr',
    version,
    token: value.token.trim(),
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
  const trimmed = raw.trim();
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
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { kind: 'unknown', raw: trimmed };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (isRecord(parsed)) {
      const walletPayload = parseWalletCreditQr(parsed);
      if (walletPayload) {
        return {
          kind: 'wallet_credit_qr',
          payload: walletPayload,
        };
      }
    }
  } catch {
    // Not JSON — evaluate as carnet / barcode heuristics below.
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
