import { buildCheckSociosScanUrl } from '@/config/env';
import { normalizeCreditsErrorCode } from '@/scanner/api/creditsScannerApi';
import { normalizeMemberScanResponse } from '@/scanner/api/memberScannerApi';
import { normalizeDni, parseQrPayload } from '@/scanner/qr/parseQrPayload';

describe('parseQrPayload', () => {
  it('detects a valid wallet_credit_qr JSON payload', () => {
    const raw = JSON.stringify({
      type: 'wallet_credit_qr',
      version: 1,
      token: 'abc123',
    });

    expect(parseQrPayload(raw)).toEqual({
      kind: 'wallet_credit_qr',
      payload: {
        type: 'wallet_credit_qr',
        version: 1,
        token: 'abc123',
      },
    });
  });

  it('returns unknown for invalid JSON content', () => {
    expect(parseQrPayload('{not-json')).toEqual({
      kind: 'unknown',
      raw: '{not-json',
    });
  });

  it('returns unknown for unrecognized plain text', () => {
    expect(parseQrPayload('hello-world')).toEqual({
      kind: 'unknown',
      raw: 'hello-world',
    });
  });

  it('detects formatted member DNI as member_qr', () => {
    expect(parseQrPayload('36.329.083')).toEqual({
      kind: 'member_qr',
      raw: '36.329.083',
      scanKind: 'dni',
      dni: '36329083',
    });
  });

  it('detects plain member DNI as member_qr', () => {
    expect(parseQrPayload('36329083')).toEqual({
      kind: 'member_qr',
      raw: '36329083',
      scanKind: 'dni',
      dni: '36329083',
    });
  });

  it('detects long barcode as member_qr barcode', () => {
    expect(parseQrPayload('123456789012')).toEqual({
      kind: 'member_qr',
      raw: '123456789012',
      scanKind: 'barcode',
      barcode: '123456789012',
    });
  });

  it('does not treat plain numeric DNI as wallet credit QR', () => {
    expect(parseQrPayload('12345678')).toEqual({
      kind: 'member_qr',
      raw: '12345678',
      scanKind: 'dni',
      dni: '12345678',
    });
  });
});

describe('normalizeDni', () => {
  it('removes formatting from DNI', () => {
    expect(normalizeDni('36.329.083')).toBe('36329083');
    expect(normalizeDni('36329083')).toBe('36329083');
  });
});

describe('buildCheckSociosScanUrl', () => {
  it('appends /checksocios/scan when base already includes /api', () => {
    expect(buildCheckSociosScanUrl('https://appvillamitre.surtekbb.com/api')).toBe(
      'https://appvillamitre.surtekbb.com/api/checksocios/scan',
    );
  });

  it('appends /api/checksocios/scan when base has no /api suffix', () => {
    expect(buildCheckSociosScanUrl('https://appvillamitre.surtekbb.com')).toBe(
      'https://appvillamitre.surtekbb.com/api/checksocios/scan',
    );
  });
});

describe('normalizeMemberScanResponse', () => {
  it('maps vmServer ok/allowed/socio response', () => {
    expect(
      normalizeMemberScanResponse({
        ok: true,
        allowed: true,
        message: 'Socio habilitado.',
        socio: {
          nombre: 'Juan Pérez',
          dni: '36329083',
        },
      }),
    ).toMatchObject({
      type: 'member_access',
      status: 'allowed',
      title: 'Puede ingresar',
      message: 'Socio habilitado.',
      person: {
        name: 'Juan Pérez',
        dni: '36329083',
      },
    });
  });

  it('maps rejected response with reason', () => {
    expect(
      normalizeMemberScanResponse({
        ok: false,
        allowed: false,
        reason: 'invalid',
        message: 'Socio no encontrado.',
      }),
    ).toMatchObject({
      status: 'invalid',
      title: 'No puede ingresar',
      message: 'Socio no encontrado.',
    });
  });
});

describe('normalizeCreditsErrorCode', () => {
  it('normalizes known backend error codes', () => {
    expect(normalizeCreditsErrorCode('insufficient_balance')).toBe('insufficient_balance');
    expect(normalizeCreditsErrorCode('EXPIRED_QR')).toBe('expired_qr');
  });

  it('falls back to unknown_error', () => {
    expect(normalizeCreditsErrorCode(undefined)).toBe('unknown_error');
    expect(normalizeCreditsErrorCode('something_else')).toBe('unknown_error');
  });
});
