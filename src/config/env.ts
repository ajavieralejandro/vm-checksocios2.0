import Constants from 'expo-constants';

const DEFAULT_SCANNER_POINT = 'vm_scanner_test';

/** Official env key for vm-creditos-api host or base URL (with or without /api). */
export const CREDITS_API_BASE_URL_ENV_KEY = 'EXPO_PUBLIC_CREDITS_API_BASE_URL';

/**
 * @deprecated Typo fallback — use EXPO_PUBLIC_CREDITS_API_BASE_URL instead.
 * Accepted temporarily for existing local .env files.
 */
export const CREDITS_API_BASE_URL_DEPRECATED_ENV_KEY =
  'EXPO_PUBLIC_CREDITS_APIS_BASE_URL';

export const SCANNER_API_TOKEN_ENV_KEY = 'EXPO_PUBLIC_SCANNER_API_TOKEN';
export const SCANNER_POINT_ENV_KEY = 'EXPO_PUBLIC_SCANNER_POINT';

export const SCANNER_TOKEN_INLINE_COMMENT_ERROR =
  'EXPO_PUBLIC_SCANNER_API_TOKEN parece tener caracteres inválidos o comentario inline. Dejalo en una línea limpia sin //';

export type EnvSource = Record<string, string | undefined>;

export type ScannerTokenInspection = {
  token?: string;
  formatError?: string;
};

function readEnv(key: string): string | undefined {
  return readEnvFrom(process.env as EnvSource, key);
}

export function readEnvFrom(env: EnvSource, key: string): string | undefined {
  const value = env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.replace(/\/+$/, '');
}

export function resolveCreditsApiBaseUrl(
  env: EnvSource = process.env as EnvSource,
): string | undefined {
  const official = normalizeBaseUrl(readEnvFrom(env, CREDITS_API_BASE_URL_ENV_KEY));
  if (official) {
    return official;
  }

  const deprecated = normalizeBaseUrl(
    readEnvFrom(env, CREDITS_API_BASE_URL_DEPRECATED_ENV_KEY),
  );
  if (deprecated) {
    if (__DEV__) {
      console.warn(
        `[Scanner] ${CREDITS_API_BASE_URL_DEPRECATED_ENV_KEY} está deprecada. ` +
          `Renombrá a ${CREDITS_API_BASE_URL_ENV_KEY} en tu .env.`,
      );
    }
    return deprecated;
  }

  return undefined;
}

export function inspectScannerApiToken(
  env: EnvSource = process.env as EnvSource,
): ScannerTokenInspection {
  const raw = env[SCANNER_API_TOKEN_ENV_KEY];

  if (raw === undefined || raw.trim().length === 0) {
    return {};
  }

  if (raw.includes('//')) {
    return { formatError: SCANNER_TOKEN_INLINE_COMMENT_ERROR };
  }

  if (raw.includes('#')) {
    return { formatError: SCANNER_TOKEN_INLINE_COMMENT_ERROR };
  }

  if (/["']/.test(raw)) {
    return {
      formatError:
        'EXPO_PUBLIC_SCANNER_API_TOKEN no debe incluir comillas. Dejalo en una línea limpia.',
    };
  }

  const token = raw.trim();

  if (/\s/.test(token)) {
    return {
      formatError:
        'EXPO_PUBLIC_SCANNER_API_TOKEN no debe contener espacios. Dejalo en una línea limpia.',
    };
  }

  if (token.startsWith('PEGAR_')) {
    return {};
  }

  return { token };
}

export function resolveScannerApiToken(
  env: EnvSource = process.env as EnvSource,
): string | undefined {
  return inspectScannerApiToken(env).token;
}

export function formatCreditsConfigErrorMessage(missingKeys: string[]): string {
  return (
    `Faltan variables de entorno: ${missingKeys.join(', ')}. ` +
    'Revisá .env y reiniciá Expo con npx expo start -c'
  );
}

export function resolveMissingCreditsEnvVars(
  env: EnvSource = process.env as EnvSource,
): string[] {
  const missing: string[] = [];

  if (!resolveCreditsApiBaseUrl(env)) {
    missing.push(CREDITS_API_BASE_URL_ENV_KEY);
  }

  const tokenInspection = inspectScannerApiToken(env);
  if (!tokenInspection.token && !tokenInspection.formatError) {
    missing.push(SCANNER_API_TOKEN_ENV_KEY);
  }

  return missing;
}

export function buildCreditsConfigValidation(
  env: EnvSource = process.env as EnvSource,
): ConfigValidation {
  const tokenInspection = inspectScannerApiToken(env);

  if (tokenInspection.formatError) {
    return {
      isValid: false,
      errorMessage: tokenInspection.formatError,
      missingEnvVars: [],
      tokenFormatError: tokenInspection.formatError,
    };
  }

  const missing = resolveMissingCreditsEnvVars(env);

  if (missing.length > 0) {
    return {
      isValid: false,
      errorMessage: formatCreditsConfigErrorMessage(missing),
      missingEnvVars: missing,
    };
  }

  return { isValid: true, missingEnvVars: [] };
}

/** Legacy CheckSocios / vmServer base URL. */
export const apiBaseUrl = normalizeBaseUrl(readEnv('EXPO_PUBLIC_API_BASE_URL'));

/** vmServer base URL (falls back to legacy EXPO_PUBLIC_API_BASE_URL). */
export const vmServerApiBaseUrl =
  normalizeBaseUrl(readEnv('EXPO_PUBLIC_VMSERVER_API_BASE_URL')) ?? apiBaseUrl;

/** vm-creditos-api host or base URL (may or may not include /api suffix). */
export const creditsApiBaseUrl = resolveCreditsApiBaseUrl();

/** Bearer token for scanner endpoints on vm-creditos-api. */
export const scannerApiToken = resolveScannerApiToken();

export const scannerPoint =
  readEnv('EXPO_PUBLIC_SCANNER_POINT') ?? DEFAULT_SCANNER_POINT;

export const appVersion =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

export type ConfigValidation = {
  isValid: boolean;
  errorMessage?: string;
  missingEnvVars?: string[];
  tokenFormatError?: string;
};

export const missingCreditsEnvVars = resolveMissingCreditsEnvVars();
export const hasScannerToken = Boolean(scannerApiToken);

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
  return buildCreditsConfigValidation();
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

export function buildCreditsScannerEndpoint(
  baseUrl: string,
  action: 'preview' | 'consume',
): string {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    throw new Error('Credits API base URL is required.');
  }

  const path =
    action === 'preview' ? '/scanner/credits/preview' : '/scanner/credits/consume';

  if (base.endsWith('/api')) {
    return `${base}${path}`;
  }

  return `${base}/api${path}`;
}

export function buildCreditsPreviewUrl(baseUrl: string): string {
  return buildCreditsScannerEndpoint(baseUrl, 'preview');
}

export function buildCreditsConsumeUrl(baseUrl: string): string {
  return buildCreditsScannerEndpoint(baseUrl, 'consume');
}

export function buildCreditReservationScannerEndpoint(
  baseUrl: string,
  action: 'preview' | 'check-in',
): string {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    throw new Error('Credits API base URL is required.');
  }

  const path =
    action === 'preview'
      ? '/scanner/credit-reservations/preview'
      : '/scanner/credit-reservations/check-in';

  if (base.endsWith('/api')) {
    return `${base}${path}`;
  }

  return `${base}/api${path}`;
}

export function buildCreditReservationPreviewUrl(baseUrl: string): string {
  return buildCreditReservationScannerEndpoint(baseUrl, 'preview');
}

export function buildCreditReservationCheckInUrl(baseUrl: string): string {
  return buildCreditReservationScannerEndpoint(baseUrl, 'check-in');
}

export function getCreditReservationPreviewUrl(): string {
  if (!creditsApiBaseUrl) {
    throw new Error('Credits API base URL is not configured.');
  }

  return buildCreditReservationPreviewUrl(creditsApiBaseUrl);
}

export function getCreditReservationCheckInUrl(): string {
  if (!creditsApiBaseUrl) {
    throw new Error('Credits API base URL is not configured.');
  }

  return buildCreditReservationCheckInUrl(creditsApiBaseUrl);
}

export function getCreditsPreviewUrl(): string {
  if (!creditsApiBaseUrl) {
    throw new Error('Credits API base URL is not configured.');
  }

  return buildCreditsPreviewUrl(creditsApiBaseUrl);
}

export function getCreditsConsumeUrl(): string {
  if (!creditsApiBaseUrl) {
    throw new Error('Credits API base URL is not configured.');
  }

  return buildCreditsConsumeUrl(creditsApiBaseUrl);
}

export function getMemberAccessScanUrl(): string {
  const base = vmServerApiBaseUrl!;
  return `${base}/api/club-scanner/member-access/scan`;
}

export function buildCheckSociosScanUrl(baseUrl: string): string {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    throw new Error('vmServer API base URL is required.');
  }

  if (base.endsWith('/api')) {
    return `${base}/checksocios/scan`;
  }

  return `${base}/api/checksocios/scan`;
}

export function getCheckSociosScanUrl(): string {
  return buildCheckSociosScanUrl(vmServerApiBaseUrl!);
}

export const creditsPreviewUrl = creditsApiBaseUrl
  ? buildCreditsPreviewUrl(creditsApiBaseUrl)
  : undefined;

export const creditsConsumeUrl = creditsApiBaseUrl
  ? buildCreditsConsumeUrl(creditsApiBaseUrl)
  : undefined;
