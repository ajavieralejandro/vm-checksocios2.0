import {
  getCreditsConsumeUrl,
  getCreditsPreviewUrl,
  scannerApiToken,
  validateCreditsConfig,
} from '@/config/env';
import type {
  CreditsConsumeData,
  CreditsConsumeResult,
  CreditsErrorCode,
  CreditsPreviewData,
  CreditsPreviewResult,
  WalletCreditQrPayload,
} from '@/types/credits';

const REQUEST_TIMEOUT_MS = 15_000;

const ERROR_CODE_ALIASES: Record<string, CreditsErrorCode> = {
  invalid_qr: 'invalid_qr',
  expired_qr: 'expired_qr',
  inactive_qr: 'inactive_qr',
  wallet_not_found: 'wallet_not_found',
  insufficient_balance: 'insufficient_balance',
  scanner_unauthorized: 'scanner_unauthorized',
  network_error: 'network_error',
  unknown_error: 'unknown_error',
};

export function normalizeCreditsErrorCode(value: unknown): CreditsErrorCode {
  if (typeof value !== 'string') {
    return 'unknown_error';
  }

  const normalized = value.trim().toLowerCase();
  return ERROR_CODE_ALIASES[normalized] ?? 'unknown_error';
}

export function getCreditsErrorMessage(code: CreditsErrorCode): string {
  switch (code) {
    case 'invalid_qr':
      return 'QR inválido o vencido';
    case 'expired_qr':
      return 'QR inválido o vencido';
    case 'inactive_qr':
      return 'QR inválido o vencido';
    case 'wallet_not_found':
      return 'Billetera no encontrada';
    case 'insufficient_balance':
      return 'Saldo insuficiente';
    case 'scanner_unauthorized':
      return 'Scanner no autorizado';
    case 'network_error':
      return 'Error de red. Verificá tu conexión.';
    default:
      return 'Ocurrió un error inesperado';
  }
}

type CreditsApiResponse = Record<string, unknown>;

async function postCreditsScanner<T>(
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; status: number; parsed: CreditsApiResponse | null }> {
  const config = validateCreditsConfig();
  if (!config.isValid) {
    return {
      ok: false,
      status: 0,
      parsed: { message: config.errorMessage, code: 'unknown_error' },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${scannerApiToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: CreditsApiResponse | null = null;

    if (rawText.length > 0) {
      try {
        const json: unknown = JSON.parse(rawText);
        parsed = typeof json === 'object' && json !== null ? (json as CreditsApiResponse) : null;
      } catch {
        parsed = { message: 'Respuesta inválida del servidor.' };
      }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        parsed = {
          ...(parsed ?? {}),
          code: parsed?.code ?? 'scanner_unauthorized',
        };
      }

      return { ok: false, status: response.status, parsed };
    }

    return { ok: true, data: (parsed ?? {}) as T };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        parsed: { code: 'network_error', message: 'La solicitud tardó demasiado.' },
      };
    }

    return {
      ok: false,
      status: 0,
      parsed: { code: 'network_error', message: 'No se pudo conectar con el servidor.' },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function readString(record: CreditsApiResponse, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(record: CreditsApiResponse, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: CreditsApiResponse, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function buildFailure(
  parsed: CreditsApiResponse | null,
  fallbackMessage: string,
): { ok: false; errorCode: CreditsErrorCode; message: string } {
  const code = normalizeCreditsErrorCode(parsed?.code ?? parsed?.reason ?? parsed?.error);
  const message =
    readString(parsed ?? {}, 'message') ??
    readString(parsed ?? {}, 'error') ??
    getCreditsErrorMessage(code) ??
    fallbackMessage;

  return {
    ok: false,
    errorCode: code,
    message,
  };
}

function normalizePreviewData(
  record: CreditsApiResponse,
  amount: number,
): CreditsPreviewData {
  const canConsume =
    readBoolean(record, 'can_consume') ??
    readBoolean(record, 'canConsume') ??
    false;

  const reasonCode = normalizeCreditsErrorCode(record.reason ?? record.code);

  return {
    memberName:
      readString(record, 'member_name') ??
      readString(record, 'memberName') ??
      readString(record, 'name'),
    balance: readNumber(record, 'balance') ?? readNumber(record, 'saldo'),
    amount: readNumber(record, 'amount') ?? amount,
    canConsume,
    reason: readString(record, 'reason') ?? readString(record, 'message'),
    reasonCode: canConsume ? undefined : reasonCode,
  };
}

function normalizeConsumeData(record: CreditsApiResponse): CreditsConsumeData {
  const approved =
    readBoolean(record, 'approved') ??
    readBoolean(record, 'ok') ??
    false;

  const reasonCode = normalizeCreditsErrorCode(record.reason ?? record.code);

  return {
    approved,
    transactionId:
      readString(record, 'transaction_id') ?? readString(record, 'transactionId'),
    newBalance:
      readNumber(record, 'new_balance') ?? readNumber(record, 'newBalance'),
    reason: readString(record, 'reason') ?? readString(record, 'message'),
    reasonCode: approved ? undefined : reasonCode,
  };
}

export async function previewWalletCreditQr(
  payload: WalletCreditQrPayload,
  amount = 1,
): Promise<CreditsPreviewResult> {
  const config = validateCreditsConfig();
  if (!config.isValid) {
    return {
      ok: false,
      errorCode: 'unknown_error',
      message: config.errorMessage ?? 'Configuración de créditos incompleta.',
    };
  }

  const response = await postCreditsScanner<CreditsApiResponse>(getCreditsPreviewUrl(), {
    type: payload.type,
    version: payload.version,
    token: payload.token,
    amount,
  });

  if (!response.ok) {
    return buildFailure(response.parsed, 'No se pudo validar el QR de créditos.');
  }

  const record = response.data;
  const apiOk = readBoolean(record, 'ok');

  if (apiOk === false) {
    return buildFailure(record, 'No se pudo validar el QR de créditos.');
  }

  return {
    ok: true,
    data: normalizePreviewData(record, amount),
  };
}

export async function consumeWalletCreditQr(
  payload: WalletCreditQrPayload,
  amount: number,
  idempotencyKey: string,
): Promise<CreditsConsumeResult> {
  const config = validateCreditsConfig();
  if (!config.isValid) {
    return {
      ok: false,
      errorCode: 'unknown_error',
      message: config.errorMessage ?? 'Configuración de créditos incompleta.',
    };
  }

  const response = await postCreditsScanner<CreditsApiResponse>(getCreditsConsumeUrl(), {
    type: payload.type,
    version: payload.version,
    token: payload.token,
    amount,
    idempotency_key: idempotencyKey,
  });

  if (!response.ok) {
    return buildFailure(response.parsed, 'No se pudo consumir el crédito.');
  }

  const record = response.data;
  const apiOk = readBoolean(record, 'ok');

  if (apiOk === false) {
    return buildFailure(record, 'No se pudo consumir el crédito.');
  }

  return {
    ok: true,
    data: normalizeConsumeData(record),
  };
}
