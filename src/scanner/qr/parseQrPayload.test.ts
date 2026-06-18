import { normalizeCreditsErrorCode } from '@/scanner/api/creditsScannerApi';
import { parseQrPayload } from '@/scanner/qr/parseQrPayload';

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

  it('detects member DNI formatted QR as member_qr', () => {
    expect(parseQrPayload('36.329.083')).toEqual({
      kind: 'member_qr',
      raw: '36.329.083',
    });
  });

  it('does not treat plain userId-like numeric string as wallet credit QR', () => {
    const raw = '12345678';

    expect(parseQrPayload(raw)).toEqual({
      kind: 'member_qr',
      raw: '12345678',
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
