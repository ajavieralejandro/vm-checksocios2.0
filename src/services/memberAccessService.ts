import { validateMemberQr } from '@/scanner/api/memberScannerApi';
import type { MemberAccessScanResponse } from '@/types/scanner';

function buildErrorResponse(message: string): MemberAccessScanResponse {
  return {
    type: 'member_access',
    status: 'error',
    title: 'Error de validación',
    message,
    person: null,
    metadata: undefined,
  };
}

export async function scanMemberAccess(
  qrPayload: string,
): Promise<MemberAccessScanResponse> {
  const trimmedPayload = qrPayload.trim();

  if (trimmedPayload.length === 0) {
    return buildErrorResponse('El código escaneado está vacío.');
  }

  return validateMemberQr(trimmedPayload);
}
