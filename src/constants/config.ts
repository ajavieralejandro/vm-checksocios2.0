import Constants from 'expo-constants';

const DEFAULT_SCANNER_POINT = 'portería_principal';

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export const apiBaseUrl = readEnv('EXPO_PUBLIC_API_BASE_URL');

export const scannerPoint =
  readEnv('EXPO_PUBLIC_SCANNER_POINT') ?? DEFAULT_SCANNER_POINT;

export const appVersion =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

export type ConfigValidation = {
  isValid: boolean;
  missingApiBaseUrl: boolean;
  errorMessage?: string;
};

export function validateConfig(): ConfigValidation {
  if (!apiBaseUrl) {
    const errorMessage =
      'Falta EXPO_PUBLIC_API_BASE_URL. Configurá la URL del backend en .env antes de escanear.';

    if (__DEV__) {
      console.error('[CheckSocios] Config error:', errorMessage);
    }

    return {
      isValid: false,
      missingApiBaseUrl: true,
      errorMessage,
    };
  }

  return {
    isValid: true,
    missingApiBaseUrl: false,
  };
}

export function getMemberAccessScanUrl(): string {
  const base = apiBaseUrl!.replace(/\/+$/, '');
  return `${base}/api/club-scanner/member-access/scan`;
}
