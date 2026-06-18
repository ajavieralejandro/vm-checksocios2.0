import Constants from 'expo-constants';

const DEFAULT_SCANNER_POINT = 'portería_principal';

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/** Legacy CheckSocios / vmServer base URL. */
export const apiBaseUrl = readEnv('EXPO_PUBLIC_API_BASE_URL');

/** vmServer base URL (falls back to legacy EXPO_PUBLIC_API_BASE_URL). */
export const vmServerApiBaseUrl =
  readEnv('EXPO_PUBLIC_VMSERVER_API_BASE_URL') ?? apiBaseUrl;

/** vm-creditos-api base URL (should include /api suffix). */
export const creditsApiBaseUrl = readEnv('EXPO_PUBLIC_CREDITS_API_BASE_URL');

/** Bearer token for scanner endpoints on vm-creditos-api. */
export const scannerApiToken = readEnv('EXPO_PUBLIC_SCANNER_API_TOKEN');

export const scannerPoint =
  readEnv('EXPO_PUBLIC_SCANNER_POINT') ?? DEFAULT_SCANNER_POINT;

export const appVersion =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

export type ConfigValidation = {
  isValid: boolean;
  errorMessage?: string;
};

export function validateMemberConfig(): ConfigValidation {
  if (!vmServerApiBaseUrl) {
    return {
      isValid: false,
      errorMessage:
        'Falta EXPO_PUBLIC_VMSERVER_API_BASE_URL o EXPO_PUBLIC_API_BASE_URL para validación de socios.',
    };
  }

  return { isValid: true };
}

export function validateCreditsConfig(): ConfigValidation {
  const missing: string[] = [];

  if (!creditsApiBaseUrl) {
    missing.push('EXPO_PUBLIC_CREDITS_API_BASE_URL');
  }

  if (!scannerApiToken) {
    missing.push('EXPO_PUBLIC_SCANNER_API_TOKEN');
  }

  if (missing.length > 0) {
    return {
      isValid: false,
      errorMessage: `Faltan variables de entorno: ${missing.join(', ')}.`,
    };
  }

  return { isValid: true };
}

/** @deprecated Use validateMemberConfig or validateCreditsConfig. */
export function validateConfig(): ConfigValidation & { missingApiBaseUrl: boolean } {
  const member = validateMemberConfig();

  if (!member.isValid) {
    if (__DEV__) {
      console.error('[Scanner] Config error:', member.errorMessage);
    }

    return {
      isValid: false,
      missingApiBaseUrl: true,
      errorMessage: member.errorMessage,
    };
  }

  return {
    isValid: true,
    missingApiBaseUrl: false,
  };
}

export function getCreditsPreviewUrl(): string {
  const base = creditsApiBaseUrl!.replace(/\/+$/, '');
  return `${base}/scanner/credits/preview`;
}

export function getCreditsConsumeUrl(): string {
  const base = creditsApiBaseUrl!.replace(/\/+$/, '');
  return `${base}/scanner/credits/consume`;
}

export function getMemberAccessScanUrl(): string {
  const base = vmServerApiBaseUrl!.replace(/\/+$/, '');
  return `${base}/api/club-scanner/member-access/scan`;
}

export function buildCheckSociosScanUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');

  if (base.endsWith('/api')) {
    return `${base}/checksocios/scan`;
  }

  return `${base}/api/checksocios/scan`;
}

export function getCheckSociosScanUrl(): string {
  return buildCheckSociosScanUrl(vmServerApiBaseUrl!);
}
