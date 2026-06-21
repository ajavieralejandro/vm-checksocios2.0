import type { EnvSource } from '@/config/env';
import {
  buildCreditsConfigValidation,
  buildCreditsConsumeUrl,
  buildCreditsPreviewUrl,
  buildCreditReservationPreviewUrl,
  CREDITS_API_BASE_URL_DEPRECATED_ENV_KEY,
  CREDITS_API_BASE_URL_ENV_KEY,
  formatCreditsConfigErrorMessage,
  inspectScannerApiToken,
  resolveCreditsApiBaseUrl,
  resolveScannerApiToken,
  SCANNER_API_TOKEN_ENV_KEY,
  SCANNER_TOKEN_INLINE_COMMENT_ERROR,
} from '@/config/env';

describe('credits env configuration', () => {
  const baseEnv: EnvSource = {
    [CREDITS_API_BASE_URL_ENV_KEY]: 'https://cvmcreditos.surtekbb.com/',
    [SCANNER_API_TOKEN_ENV_KEY]: 'test-token',
  };

  it('reads EXPO_PUBLIC_CREDITS_API_BASE_URL and strips trailing slash', () => {
    expect(resolveCreditsApiBaseUrl(baseEnv)).toBe('https://cvmcreditos.surtekbb.com');
  });

  it('accepts deprecated EXPO_PUBLIC_CREDITS_APIS_BASE_URL as fallback', () => {
    const env: EnvSource = {
      [CREDITS_API_BASE_URL_DEPRECATED_ENV_KEY]: 'https://cvmcreditos.surtekbb.com/',
      [SCANNER_API_TOKEN_ENV_KEY]: 'test-token',
    };

    expect(resolveCreditsApiBaseUrl(env)).toBe('https://cvmcreditos.surtekbb.com');
  });

  it('prefers official key over deprecated typo key', () => {
    const env: EnvSource = {
      [CREDITS_API_BASE_URL_ENV_KEY]: 'https://official.example.com',
      [CREDITS_API_BASE_URL_DEPRECATED_ENV_KEY]: 'https://typo.example.com',
      [SCANNER_API_TOKEN_ENV_KEY]: 'test-token',
    };

    expect(resolveCreditsApiBaseUrl(env)).toBe('https://official.example.com');
  });

  it('reports missing EXPO_PUBLIC_SCANNER_API_TOKEN', () => {
    const env: EnvSource = {
      [CREDITS_API_BASE_URL_ENV_KEY]: 'https://cvmcreditos.surtekbb.com',
    };

    const validation = buildCreditsConfigValidation(env);

    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain(SCANNER_API_TOKEN_ENV_KEY);
    expect(validation.errorMessage).toContain('npx expo start -c');
  });

  it('detects token with inline comment', () => {
    const env: EnvSource = {
      [CREDITS_API_BASE_URL_ENV_KEY]: 'https://cvmcreditos.surtekbb.com',
      [SCANNER_API_TOKEN_ENV_KEY]: 'abc123 // comentario',
    };

    const validation = buildCreditsConfigValidation(env);

    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toBe(SCANNER_TOKEN_INLINE_COMMENT_ERROR);
    expect(inspectScannerApiToken(env).formatError).toBe(SCANNER_TOKEN_INLINE_COMMENT_ERROR);
  });

  it('reports missing credits base URL with restart hint', () => {
    const validation = buildCreditsConfigValidation({});

    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toBe(
      formatCreditsConfigErrorMessage([
        CREDITS_API_BASE_URL_ENV_KEY,
        SCANNER_API_TOKEN_ENV_KEY,
      ]),
    );
  });

  it('builds preview URL from host without /api suffix', () => {
    expect(buildCreditsPreviewUrl('https://cvmcreditos.surtekbb.com')).toBe(
      'https://cvmcreditos.surtekbb.com/api/scanner/credits/preview',
    );
  });

  it('builds preview URL when base already includes /api', () => {
    expect(buildCreditsPreviewUrl('https://cvmcreditos.surtekbb.com/api')).toBe(
      'https://cvmcreditos.surtekbb.com/api/scanner/credits/preview',
    );
  });

  it('builds consume URL without duplicating /api', () => {
    expect(buildCreditsConsumeUrl('https://cvmcreditos.surtekbb.com/api/')).toBe(
      'https://cvmcreditos.surtekbb.com/api/scanner/credits/consume',
    );
  });

  it('builds reservation preview URL from host without /api suffix', () => {
    expect(
      buildCreditReservationPreviewUrl('https://cvmcreditos.surtekbb.com'),
    ).toBe('https://cvmcreditos.surtekbb.com/api/scanner/credit-reservations/preview');
  });

  it('reads scanner token from env', () => {
    expect(resolveScannerApiToken(baseEnv)).toBe('test-token');
  });
});
