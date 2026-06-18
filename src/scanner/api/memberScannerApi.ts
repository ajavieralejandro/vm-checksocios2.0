import { ApiClientError, postJson } from '@/api/apiClient';
import {
  getCheckSociosScanUrl,
  scannerPoint,
  validateMemberConfig,
} from '@/config/env';
import { classifyMemberScan } from '@/scanner/qr/parseQrPayload';
import type { MemberAccessScanResponse, ScanStatus } from '@/types/scanner';

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function buildErrorResponse(message: string, status: ScanStatus = 'error'): MemberAccessScanResponse {
  return {
    type: 'member_access',
    status,
    title: 'Error de validación',
    message,
    person: null,
    metadata: undefined,
  };
}

function parseSocio(value: unknown): MemberAccessScanResponse['person'] {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    name:
      readString(record, 'name') ??
      readString(record, 'nombre') ??
      readString(record, 'full_name'),
    dni: readString(record, 'dni'),
  };
}

function mapReasonToStatus(reason: unknown, allowed: boolean | undefined): ScanStatus {
  if (typeof reason !== 'string') {
    return allowed ? 'allowed' : 'rejected';
  }

  const normalized = reason.toLowerCase();

  if (normalized.includes('warning') || normalized.includes('deuda')) {
    return 'allowed_with_warning';
  }

  if (normalized.includes('expired') || normalized.includes('venc')) {
    return 'expired';
  }

  if (normalized.includes('invalid')) {
    return 'invalid';
  }

  return allowed ? 'allowed' : 'rejected';
}

export function normalizeMemberScanResponse(data: unknown): MemberAccessScanResponse {
  if (typeof data !== 'object' || data === null) {
    return buildErrorResponse('Respuesta inválida del servidor.');
  }

  const record = data as Record<string, unknown>;
  const socio = parseSocio(record.socio ?? record.person);
  const message =
    readString(record, 'message') ?? readString(record, 'reason') ?? 'Sin detalle adicional.';
  const allowed = typeof record.allowed === 'boolean' ? record.allowed : undefined;
  const ok = typeof record.ok === 'boolean' ? record.ok : undefined;

  if (ok === false) {
    const status = mapReasonToStatus(record.reason, false);

    return {
      type: 'member_access',
      status,
      title: 'No puede ingresar',
      message,
      person: socio,
      metadata:
        typeof record.metadata === 'object' && record.metadata !== null
          ? (record.metadata as Record<string, unknown>)
          : undefined,
    };
  }

  if (typeof record.status === 'string') {
    const legacyStatus = record.status as ScanStatus;

    return {
      type: 'member_access',
      status: legacyStatus,
      title: readString(record, 'title') ?? 'Resultado de ingreso',
      message,
      person: socio ?? parseSocio(record.person),
      metadata:
        typeof record.metadata === 'object' && record.metadata !== null
          ? (record.metadata as Record<string, unknown>)
          : undefined,
    };
  }

  const status = mapReasonToStatus(record.reason, allowed);

  return {
    type: 'member_access',
    status,
    title: allowed ? 'Puede ingresar' : 'No puede ingresar',
    message,
    person: socio,
    metadata:
      typeof record.metadata === 'object' && record.metadata !== null
        ? (record.metadata as Record<string, unknown>)
        : undefined,
  };
}

function buildScanRequestBody(raw: string) {
  const scan = classifyMemberScan(raw);

  if (!scan) {
    return null;
  }

  if (scan.scanKind === 'dni') {
    return {
      dni: scan.dni,
      raw_scan: scan.raw,
      scan_kind: 'dni' as const,
      point: scannerPoint,
    };
  }

  return {
    barcode: scan.barcode,
    raw_scan: scan.raw,
    scan_kind: 'barcode' as const,
    point: scannerPoint,
  };
}

export async function validateMemberQr(raw: string): Promise<MemberAccessScanResponse> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return buildErrorResponse('El código escaneado está vacío.', 'invalid');
  }

  const body = buildScanRequestBody(trimmed);
  if (!body) {
    return buildErrorResponse('Código de socio no reconocido.', 'invalid');
  }

  const config = validateMemberConfig();
  if (!config.isValid) {
    return buildErrorResponse(config.errorMessage ?? 'Configuración incompleta.');
  }

  try {
    const response = await postJson<unknown>({
      url: getCheckSociosScanUrl(),
      body,
    });

    return normalizeMemberScanResponse(response);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return buildErrorResponse(error.message);
    }

    return buildErrorResponse('Ocurrió un error inesperado al validar el ingreso.');
  }
}
