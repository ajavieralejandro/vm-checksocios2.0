export type MemberValidationResult = {
  ok: false;
  status: 'not_implemented';
  message: string;
};

/**
 * TODO(vmServer): Implementar cuando exista contrato definitivo con vmServer/socios.
 * Depende de EXPO_PUBLIC_VMSERVER_API_BASE_URL y endpoint acordado (ej. checksocios/scan).
 */
export async function validateMemberQr(raw: string): Promise<MemberValidationResult> {
  void raw;

  return {
    ok: false,
    status: 'not_implemented',
    message: 'La validación de socios/vmServer está pendiente de contrato.',
  };
}
