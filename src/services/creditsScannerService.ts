import {
  getCreditReservationCheckInUrl,
  getCreditReservationPreviewUrl,
  getCreditsConsumeUrl,
  getCreditsPreviewUrl,
  scannerApiToken,
  scannerPoint,
  validateCreditsConfig,
} from '@/config/env';
import type { WalletCreditQrPayload } from '@/types/credits';

const REQUEST_TIMEOUT_MS = 15_000;

export type CreditsScannerApiResponse = Record<string, unknown>;

export function buildWalletCreditPreviewBody(
  payload: WalletCreditQrPayload,
  amount: number,
) {
  return {
    qr_payload: {
      type: payload.type,
      version: payload.version,
      token: payload.token,
    },
    amount,
  };
}

export function buildWalletCreditConsumeBody(
  payload: WalletCreditQrPayload,
  amount: number,
  idempotencyKey: string,
) {
  return {
    ...buildWalletCreditPreviewBody(payload, amount),
    idempotency_key: idempotencyKey,
  };
}

type PostCreditsResult =
  | { ok: true; data: CreditsScannerApiResponse }
  | { ok: false; status: number; parsed: CreditsScannerApiResponse | null };

export async function postCreditsScannerRequest(
  url: string,
  body: unknown,
): Promise<PostCreditsResult> {
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
    let parsed: CreditsScannerApiResponse | null = null;

    if (rawText.length > 0) {
      try {
        const json: unknown = JSON.parse(rawText);
        parsed =
          typeof json === 'object' && json !== null
            ? (json as CreditsScannerApiResponse)
            : null;
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

    return { ok: true, data: parsed ?? {} };
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

export async function postWalletCreditPreview(
  payload: WalletCreditQrPayload,
  amount: number,
): Promise<PostCreditsResult> {
  return postCreditsScannerRequest(
    getCreditsPreviewUrl(),
    buildWalletCreditPreviewBody(payload, amount),
  );
}

export async function postWalletCreditConsume(
  payload: WalletCreditQrPayload,
  amount: number,
  idempotencyKey: string,
): Promise<PostCreditsResult> {
  return postCreditsScannerRequest(
    getCreditsConsumeUrl(),
    buildWalletCreditConsumeBody(payload, amount, idempotencyKey),
  );
}

export function buildCreditReservationBody(qrToken: string, idempotencyKey?: string) {
  return {
    qr_token: qrToken,
    scanner_point: scannerPoint,
    ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
  };
}

export async function postCreditReservationPreview(
  qrToken: string,
): Promise<PostCreditsResult> {
  return postCreditsScannerRequest(
    getCreditReservationPreviewUrl(),
    buildCreditReservationBody(qrToken),
  );
}

export async function postCreditReservationCheckIn(
  qrToken: string,
  idempotencyKey?: string,
): Promise<PostCreditsResult> {
  return postCreditsScannerRequest(
    getCreditReservationCheckInUrl(),
    buildCreditReservationBody(qrToken, idempotencyKey),
  );
}
