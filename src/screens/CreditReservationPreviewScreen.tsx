import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScanStatusColors, Spacing } from '@/constants/theme';
import {
  checkInCreditReservationQr,
  getReservationErrorMessage,
} from '@/scanner/api/creditReservationScannerApi';
import type { CreditReservationQrPayload } from '@/types/creditReservation';
import type {
  CreditReservationFlowPhase,
  CreditReservationPreviewData,
} from '@/types/creditReservation';

type PreviewRouteParams = {
  reservationPayload?: string;
  previewData?: string;
  rawScan?: string;
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

  return `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CreditReservationPreviewScreen() {
  const router = useRouter();
  const { reservationPayload, previewData, rawScan } =
    useLocalSearchParams<PreviewRouteParams>();
  const checkInStartedRef = useRef(false);

  const reservation = useMemo(
    () => parseJsonParam<CreditReservationQrPayload>(reservationPayload),
    [reservationPayload],
  );
  const preview = useMemo(
    () => parseJsonParam<CreditReservationPreviewData>(previewData),
    [previewData],
  );

  const [phase, setPhase] = useState<CreditReservationFlowPhase>('preview');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canConfirm = preview?.canCheckIn === true && phase === 'preview';

  const handleConfirmCheckIn = useCallback(async () => {
    if (!reservation || !preview || !canConfirm || checkInStartedRef.current) {
      return;
    }

    checkInStartedRef.current = true;
    setPhase('checking_in');
    setStatusMessage('Confirmando ingreso...');

    const idempotencyKey = generateIdempotencyKey();
    const result = await checkInCreditReservationQr(reservation, idempotencyKey);

    if (!result.ok) {
      setPhase('error');
      setStatusMessage(result.message);
      return;
    }

    if (result.data.checkedIn) {
      setPhase('checked_in');
      setStatusMessage('Ingreso confirmado');
      return;
    }

    const reasonCode = result.data.reasonCode ?? 'unknown_error';
    setPhase('rejected');
    setStatusMessage(result.data.reason ?? getReservationErrorMessage(reasonCode));
  }, [canConfirm, preview, reservation]);

  if (!reservation || !preview) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">Preview no disponible</ThemedText>
          <ThemedText themeColor="textSecondary">
            No se recibieron datos del QR de reserva. Volvé al escáner e intentá de nuevo.
          </ThemedText>
          <PrimaryButton label="Escanear otro" onPress={() => router.replace('/')} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isProcessing = phase === 'checking_in';
  const accent =
    phase === 'checked_in'
      ? ScanStatusColors.allowed
      : phase === 'rejected' || phase === 'error'
        ? ScanStatusColors.rejected
        : ScanStatusColors.warning;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">QR de reserva detectado</ThemedText>

          {__DEV__ && rawScan ? (
            <ThemedView type="backgroundElement" style={styles.debugBox}>
              <ThemedText type="smallBold">Debug</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" selectable>
                Raw: {rawScan}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Parseado: credit_reservation_qr
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.card}>
            <View style={[styles.statusBar, { backgroundColor: accent }]} />
            <View style={styles.cardBody}>
              {phase === 'preview' ? (
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Preview reserva
                </ThemedText>
              ) : null}

              {preview.memberName ? (
                <ThemedText style={styles.detail}>
                  <ThemedText type="smallBold">Socio: </ThemedText>
                  {preview.memberName}
                </ThemedText>
              ) : null}

              {preview.activity ? (
                <ThemedText style={styles.detail}>
                  <ThemedText type="smallBold">Actividad: </ThemedText>
                  {preview.activity}
                </ThemedText>
              ) : null}

              {preview.scheduledAt ? (
                <ThemedText style={styles.detail}>
                  <ThemedText type="smallBold">Fecha/hora: </ThemedText>
                  {preview.scheduledAt}
                </ThemedText>
              ) : null}

              {typeof preview.creditsUsed === 'number' ? (
                <ThemedText style={styles.detail}>
                  <ThemedText type="smallBold">Créditos utilizados: </ThemedText>
                  {preview.creditsUsed}
                </ThemedText>
              ) : null}

              {preview.status ? (
                <ThemedText style={styles.detail}>
                  <ThemedText type="smallBold">Estado: </ThemedText>
                  {preview.status}
                </ThemedText>
              ) : null}

              {phase === 'preview' && !preview.canCheckIn ? (
                <ThemedText style={styles.warningText}>
                  {preview.reasonCode === 'already_checked_in'
                    ? 'La reserva ya fue registrada'
                    : (preview.reason ?? 'No se puede confirmar el ingreso.')}
                </ThemedText>
              ) : null}

              {phase === 'checked_in' ? (
                <>
                  <ThemedText type="subtitle" style={styles.successTitle}>
                    INGRESO CONFIRMADO
                  </ThemedText>
                  <ThemedText style={styles.detail}>{statusMessage}</ThemedText>
                </>
              ) : null}

              {phase === 'rejected' || phase === 'error' ? (
                <ThemedText style={styles.warningText}>{statusMessage}</ThemedText>
              ) : null}
            </View>
          </ThemedView>
        </View>

        <View style={styles.actions}>
          {phase === 'preview' && canConfirm ? (
            <PrimaryButton
              label="Confirmar ingreso"
              loading={isProcessing}
              disabled={isProcessing}
              onPress={() => {
                void handleConfirmCheckIn();
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
  debugBox: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
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
  successTitle: {
    color: ScanStatusColors.allowed,
  },
  actions: {
    gap: Spacing.two,
  },
});
