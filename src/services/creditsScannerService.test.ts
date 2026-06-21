import { buildWalletCreditPreviewBody } from '@/services/creditsScannerService';

describe('creditsScannerService', () => {
  it('builds preview body with qr_payload object', () => {
    expect(
      buildWalletCreditPreviewBody(
        {
          type: 'wallet_credit_qr',
          version: 1,
          token: 'abc-123',
        },
        1,
      ),
    ).toEqual({
      qr_payload: {
        type: 'wallet_credit_qr',
        version: 1,
        token: 'abc-123',
      },
      amount: 1,
    });
  });
});
