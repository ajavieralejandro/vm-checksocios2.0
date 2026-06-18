import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScanStatusColors, Spacing } from '@/constants/theme';
import {
  consumeWalletCreditQr,
  getCreditsErrorMessage,
} from '@/scanner/api/creditsScannerApi';
import type { WalletCreditQrPayload } from '@/scanner/qr/parseQrPayload';
import type { CreditsFlowPhase, CreditsPreviewData } from '@/types/credits';

type PreviewRouteParams = {
  walletPayload?: string;
  previewData?: string;
};

function parseJsonParam<T>(raw: string | undefined): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function generateIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `consume-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPhaseAccent(phase: CreditsFlowPhase): string {
  switch (phase) {
    case 'approved':
      return ScanStatusColors.allowed;
    case 'rejected':
      return ScanStatusColors.rejected;
    case 'error':
      return ScanStatusColors.neutral;
    default:
      return ScanStatusColors.warning;
  }
}

export function CreditsPreviewScreen() {
  const router = useRouter();
  const { walletPayload, previewData } = useLocalSearchParams<PreviewRouteParams>();
  const consumeStartedRef = useRef(false);

  const wallet = useMemo(
    () => parseJsonParam<WalletCreditQrPayload>(walletPayload),
    [walletPayload],
  );
  const preview = useMemo(
    () => parseJsonParam<CreditsPreviewData>(previewData),
    [previewData],
  );

  const [phase, setPhase] = useState<CreditsFlowPhase>('preview');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | undefined>();
  const [newBalance, setNewBalance] = useState<number | undefined>();

  const amount = preview?.amount ?? 1;
  const canConfirm = preview?.canConsume === true && phase === 'preview';

  const handleConfirmConsume = useCallback(async () => {
    if (!wallet || !preview || !canConfirm || consumeStartedRef.current) {
      return;
    }

    consumeStartedRef.current = true;
    setPhase('consuming');
    setStatusMessage('Procesando consumo...');

    const idempotencyKey = generateIdempotencyKey();
    const result = await consumeWalletCreditQr(wallet, amount, idempotencyKey);

    if (!result.ok) {
      setPhase('error');
      setStatusMessage(result.message);
      return;
    }

    if (result.data.approved) {
      setPhase('approved');
      setTransactionId(result.data.transactionId);
      setNewBalance(result.data.newBalance);
      setStatusMessage('Transacción aprobada');
      return;
    }

    const reasonCode = result.data.reasonCode ?? 'unknown_error';
    setPhase('rejected');
    setStatusMessage(
      result.data.reason ??
        getCreditsErrorMessage(reasonCode),
    );
  }, [amount, canConfirm, preview, wallet]);

  if (!wallet || !preview) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">Preview no disponible</ThemedText>
          <ThemedText themeColor="textSecondary">
            No se recibieron datos del QR. Volvé al escáner e intentá de nuevo.
          </ThemedText>
          <PrimaryButton label="Escanear otro" onPress={() => router.replace('/')} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const accent = getPhaseAccent(phase);
  const isProcessing = phase === 'consuming';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">QR de créditos detectado</ThemedText>

          <ThemedView style={styles.card}>
            <View style={[styles.statusBar, { backgroundColor: accent }]} />
            <View style={styles.cardBody}>
              {phase === 'preview' ? (
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Preview
                </ThemedText>
              ) : null}

              {preview.memberName ? (
                <ThemedText style={styles.detail}>
                  <ThemedText type="smallBold">Socio: </ThemedText>
                  {preview.memberName}
                </ThemedText>
              ) : null}

              {typeof preview.balance === 'number' ? (
                <ThemedText style={styles.detail}>
                  <ThemedText type="smallBold">Saldo: </ThemedText>
                  {preview.balance}
                </ThemedText>
              ) : null}

              <ThemedText style={styles.detail}>
                <ThemedText type="smallBold">Cantidad a consumir: </ThemedText>
                {amount}
              </ThemedText>

              {phase === 'preview' && !preview.canConsume ? (
                <ThemedText style={styles.warningText}>
                  {preview.reasonCode === 'insufficient_balance' ||
                  preview.reason?.toLowerCase().includes('insufficient')
                    ? 'Saldo insuficiente'
                    : (preview.reason ?? 'No se puede consumir con este QR.')}
                </ThemedText>
              ) : null}

              {phase === 'approved' ? (
                <>
                  <ThemedText type="subtitle" style={styles.approvedTitle}>
                    APROBADO
                  </ThemedText>
                  <ThemedText style={styles.detail}>{statusMessage}</ThemedText>
                  {transactionId ? (
                    <ThemedText style={styles.detail}>
                      <ThemedText type="smallBold">Transacción: </ThemedText>
                      {transactionId}
                    </ThemedText>
                  ) : null}
                  {typeof newBalance === 'number' ? (
                    <ThemedText style={styles.detail}>
                      <ThemedText type="smallBold">Nuevo saldo: </ThemedText>
                      {newBalance}
                    </ThemedText>
                  ) : null}
                </>
              ) : null}

              {phase === 'rejected' || phase === 'error' ? (
                <ThemedText style={styles.warningText}>{statusMessage}</ThemedText>
              ) : null}
            </View>
          </ThemedView>
        </View>

        <View style={styles.actions}>
          {phase === 'preview' ? (
            <PrimaryButton
              label={`Confirmar consumo de ${amount} crédito${amount === 1 ? '' : 's'}`}
              loading={isProcessing}
              disabled={!canConfirm || isProcessing}
              onPress={() => {
                void handleConfirmConsume();
              }}
            />
          ) : null}

          <PrimaryButton
            label="Escanear otro"
            variant="secondary"
            disabled={isProcessing}
            onPress={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  statusBar: {
    height: 6,
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detail: {
    lineHeight: 22,
  },
  warningText: {
    color: '#DC2626',
    lineHeight: 22,
  },
  approvedTitle: {
    color: ScanStatusColors.allowed,
  },
  actions: {
    gap: Spacing.two,
  },
});
