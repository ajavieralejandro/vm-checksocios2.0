import {
  postCreditReservationCheckIn,
  postCreditReservationPreview,
} from '@/services/creditsScannerService';
import { validateCreditsConfig } from '@/config/env';
import type {
  CreditReservationCheckInData,
  CreditReservationCheckInResult,
  CreditReservationErrorCode,
  CreditReservationPreviewData,
  CreditReservationPreviewResult,
  CreditReservationQrPayload,
} from '@/types/creditReservation';

const ERROR_CODE_ALIASES: Record<string, CreditReservationErrorCode> = {
  reservation_not_found: 'reservation_not_found',
  already_checked_in: 'already_checked_in',
  invalid_qr: 'invalid_qr',
  expired_qr: 'expired_qr',
  scanner_unauthorized: 'scanner_unauthorized',
  network_error: 'network_error',
  unknown_error: 'unknown_error',
};

export function normalizeReservationErrorCode(value: unknown): CreditReservationErrorCode {
  if (typeof value !== 'string') {
    return 'unknown_error';
  }

  const normalized = value.trim().toLowerCase();
  return ERROR_CODE_ALIASES[normalized] ?? 'unknown_error';
}

export function getReservationErrorMessage(code: CreditReservationErrorCode): string {
  switch (code) {
    case 'reservation_not_found':
      return 'Reserva no encontrada';
    case 'already_checked_in':
      return 'La reserva ya fue registrada';
    case 'invalid_qr':
      return 'QR inválido o vencido';
    case 'expired_qr':
      return 'QR inválido o vencido';
    case 'scanner_unauthorized':
      return 'Scanner no autorizado';
    case 'network_error':
      return 'Error de red. Verificá tu conexión.';
    default:
      return 'Ocurrió un error inesperado';
  }
}

type ApiResponse = Record<string, unknown>;

function readString(record: ApiResponse, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(record: ApiResponse, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: ApiResponse, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function buildFailure(
  parsed: ApiResponse | null,
  fallbackMessage: string,
): { ok: false; errorCode: CreditReservationErrorCode; message: string } {
  const code = normalizeReservationErrorCode(parsed?.code ?? parsed?.reason ?? parsed?.error);
  const message =
    readString(parsed ?? {}, 'message') ??
    readString(parsed ?? {}, 'error') ??
    getReservationErrorMessage(code) ??
    fallbackMessage;

  return {
    ok: false,
    errorCode: code,
    message,
  };
}

function normalizePreviewData(record: ApiResponse): CreditReservationPreviewData {
  const canCheckIn =
    readBoolean(record, 'can_check_in') ??
    readBoolean(record, 'canCheckIn') ??
    readBoolean(record, 'allowed') ??
    false;

  const reasonCode = normalizeReservationErrorCode(record.reason ?? record.code);

  return {
    memberName:
      readString(record, 'member_name') ??
      readString(record, 'memberName') ??
      readString(record, 'name'),
    activity:
      readString(record, 'activity') ??
      readString(record, 'actividad') ??
      readString(record, 'activity_name'),
    scheduledAt:
      readString(record, 'scheduled_at') ??
      readString(record, 'scheduledAt') ??
      readString(record, 'datetime') ??
      readString(record, 'fecha_hora'),
    creditsUsed:
      readNumber(record, 'credits_used') ??
      readNumber(record, 'creditsUsed') ??
      readNumber(record, 'creditos_utilizados'),
    status: readString(record, 'status') ?? readString(record, 'estado'),
    canCheckIn,
    reason: readString(record, 'reason') ?? readString(record, 'message'),
    reasonCode: canCheckIn ? undefined : reasonCode,
  };
}

function normalizeCheckInData(record: ApiResponse): CreditReservationCheckInData {
  const checkedIn =
    readBoolean(record, 'checked_in') ??
    readBoolean(record, 'checkedIn') ??
    readBoolean(record, 'ok') ??
    false;

  const reasonCode = normalizeReservationErrorCode(record.reason ?? record.code);

  return {
    checkedIn,
    reservationId:
      readNumber(record, 'reservation_id') ?? readNumber(record, 'reservationId'),
    status: readString(record, 'status') ?? readString(record, 'estado'),
    reason: readString(record, 'reason') ?? readString(record, 'message'),
    reasonCode: checkedIn ? undefined : reasonCode,
  };
}

export async function previewCreditReservationByToken(
  token: string,
): Promise<CreditReservationPreviewResult> {
  const config = validateCreditsConfig();
  if (!config.isValid) {
    return {
      ok: false,
      errorCode: 'unknown_error',
      message: config.errorMessage ?? 'Configuración de créditos incompleta.',
    };
  }

  const response = await postCreditReservationPreview(token);

  if (!response.ok) {
    return buildFailure(response.parsed, 'No se pudo validar el QR de reserva.');
  }

  const record = response.data;
  const apiOk = readBoolean(record, 'ok');

  if (apiOk === false) {
    return buildFailure(record, 'No se pudo validar el QR de reserva.');
  }

  return {
    ok: true,
    data: normalizePreviewData(record),
  };
}

export async function previewCreditReservationQr(
  payload: CreditReservationQrPayload,
): Promise<CreditReservationPreviewResult> {
  return previewCreditReservationByToken(payload.token);
}

export async function checkInCreditReservationQr(
  payload: CreditReservationQrPayload,
  idempotencyKey?: string,
): Promise<CreditReservationCheckInResult> {
  const config = validateCreditsConfig();
  if (!config.isValid) {
    return {
      ok: false,
      errorCode: 'unknown_error',
      message: config.errorMessage ?? 'Configuración de créditos incompleta.',
    };
  }

  const response = await postCreditReservationCheckIn(payload.token, idempotencyKey);

  if (!response.ok) {
    return buildFailure(response.parsed, 'No se pudo confirmar el ingreso de la reserva.');
  }

  const record = response.data;
  const apiOk = readBoolean(record, 'ok');

  if (apiOk === false) {
    return buildFailure(record, 'No se pudo confirmar el ingreso de la reserva.');
  }

  return {
    ok: true,
    data: normalizeCheckInData(record),
  };
}

export function isReservationMisroutedResponse(parsed: ApiResponse | null): boolean {
  if (!parsed) {
    return false;
  }

  const candidates = [parsed.reason, parsed.status, parsed.code, parsed.error];

  return candidates.some(
    (value) =>
      typeof value === 'string' && value.trim().toLowerCase() === 'reservation_qr_misrouted',
  );
}
