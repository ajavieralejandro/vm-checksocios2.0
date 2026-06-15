import { ApiClientError, postJson } from '@/api/apiClient';
import {
  getMemberAccessScanUrl,
  scannerPoint,
  validateConfig,
} from '@/constants/config';
import type {
  MemberAccessScanResponse,
  ScanResultType,
  ScanStatus,
} from '@/types/scanner';

const VALID_STATUSES: ScanStatus[] = [
  'allowed',
  'allowed_with_warning',
  'approved',
  'rejected',
  'expired',
  'already_used',
  'invalid',
  'error',
];

function normalizeStatus(value: unknown): ScanStatus {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as ScanStatus)) {
    return value as ScanStatus;
  }

  return 'error';
}

function normalizeType(value: unknown): ScanResultType {
  return value === 'member_access' ? 'member_access' : 'unknown';
}

function buildErrorResponse(message: string): MemberAccessScanResponse {
  return {
    type: 'unknown',
    status: 'error',
    title: 'Error de validación',
    message,
    person: null,
    metadata: undefined,
  };
}

function normalizeResponse(data: unknown): MemberAccessScanResponse {
  if (typeof data !== 'object' || data === null) {
    return buildErrorResponse('Respuesta inválida del servidor.');
  }

  const record = data as Record<string, unknown>;
  const person =
    typeof record.person === 'object' && record.person !== null
      ? {
          name:
            typeof (record.person as Record<string, unknown>).name === 'string'
              ? ((record.person as Record<string, unknown>).name as string)
              : undefined,
          dni:
            typeof (record.person as Record<string, unknown>).dni === 'string'
              ? ((record.person as Record<string, unknown>).dni as string)
              : undefined,
        }
      : null;

  return {
    type: normalizeType(record.type),
    status: normalizeStatus(record.status),
    title:
      typeof record.title === 'string' && record.title.length > 0
        ? record.title
        : 'Resultado de ingreso',
    message:
      typeof record.message === 'string' && record.message.length > 0
        ? record.message
        : 'Sin detalle adicional.',
    person,
    metadata:
      typeof record.metadata === 'object' && record.metadata !== null
        ? (record.metadata as Record<string, unknown>)
        : undefined,
  };
}

export async function scanMemberAccess(
  qrPayload: string,
): Promise<MemberAccessScanResponse> {
  const trimmedPayload = qrPayload.trim();

  if (trimmedPayload.length === 0) {
    return buildErrorResponse('El código escaneado está vacío.');
  }

  const config = validateConfig();
  if (!config.isValid) {
    return buildErrorResponse(config.errorMessage ?? 'Configuración incompleta.');
  }

  try {
    const response = await postJson<unknown>({
      url: getMemberAccessScanUrl(),
      body: {
        qr_payload: trimmedPayload,
        point: scannerPoint,
      },
    });

    return normalizeResponse(response);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return buildErrorResponse(error.message);
    }

    return buildErrorResponse('Ocurrió un error inesperado al validar el ingreso.');
  }
}
