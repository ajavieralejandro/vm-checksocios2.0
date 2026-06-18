import type { WalletCreditQrPayload } from '@/types/credits';

export type ParsedQrPayload =
  | {
      kind: 'wallet_credit_qr';
      payload: WalletCreditQrPayload;
    }
  | {
      kind: 'member_qr';
      raw: string;
    }
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

function looksLikeMemberDni(raw: string): boolean {
  if (!/^[\d.\s-]+$/.test(raw)) {
    return false;
  }

  const digits = raw.replace(/[.\s-]/g, '');
  return /^\d{7,8}$/.test(digits);
}

function looksLikeMemberBarcode(raw: string): boolean {
  return /^\d{9,}$/.test(raw);
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

  if (looksLikeMemberDni(trimmed) || looksLikeMemberBarcode(trimmed)) {
    return { kind: 'member_qr', raw: trimmed };
  }

  return { kind: 'unknown', raw: trimmed };
}

export type { WalletCreditQrPayload };
