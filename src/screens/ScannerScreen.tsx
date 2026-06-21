import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { validateCreditsConfig, validateMemberConfig } from '@/config/env';
import { Spacing } from '@/constants/theme';
import { previewWalletCreditQrWithReservationFallback } from '@/scanner/api/creditsScannerApi';
import { previewCreditReservationQr } from '@/scanner/api/creditReservationScannerApi';
import { validateMemberQr } from '@/scanner/api/memberScannerApi';
import { parseQrPayload } from '@/scanner/qr/parseQrPayload';
import type { MemberAccessScanResponse } from '@/types/scanner';

const SCAN_DEBOUNCE_MS = 2_500;
const DEFAULT_CREDIT_AMOUNT = 1;

export function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(true);
  const lastScanRef = useRef<{ payload: string; timestamp: number } | null>(null);

  const creditsConfig = validateCreditsConfig();
  const memberConfig = validateMemberConfig();

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      setIsProcessing(false);
      setStatusMessage(null);
      lastScanRef.current = null;

      return () => {
        setIsFocused(false);
      };
    }, []),
  );

  const navigateToResult = useCallback(
    (result: MemberAccessScanResponse) => {
      router.push({
        pathname: '/result',
        params: { payload: JSON.stringify(result) },
      });
    },
    [router],
  );

  const navigateToStatus = useCallback(
    (title: string, message: string) => {
      router.push({
        pathname: '/status',
        params: { title, message },
      });
    },
    [router],
  );

  const handleScan = useCallback(
    async (rawPayload: string) => {
      const payload = rawPayload.trim();
      if (!payload || isProcessing) {
        return;
      }

      const now = Date.now();
      const lastScan = lastScanRef.current;
      if (
        lastScan &&
        lastScan.payload === payload &&
        now - lastScan.timestamp < SCAN_DEBOUNCE_MS
      ) {
        return;
      }

      lastScanRef.current = { payload, timestamp: now };
      setIsProcessing(true);
      setStatusMessage('Validando QR...');

      const parsed = parseQrPayload(payload);

      if (parsed.kind === 'credit_reservation_qr') {
        if (!creditsConfig.isValid) {
          navigateToStatus('Configuración incompleta', creditsConfig.errorMessage ?? '');
          setIsProcessing(false);
          setStatusMessage(null);
          return;
        }

        const preview = await previewCreditReservationQr(parsed.payload);

        if (!preview.ok) {
          navigateToStatus('QR de reserva', preview.message);
          setIsProcessing(false);
          setStatusMessage(null);
          return;
        }

        router.push({
          pathname: '/credits/reservation-preview',
          params: {
            reservationPayload: JSON.stringify(parsed.payload),
            previewData: JSON.stringify(preview.data),
            rawScan: payload,
          },
        });
        return;
      }

      if (parsed.kind === 'wallet_credit_qr') {
        if (!creditsConfig.isValid) {
          navigateToStatus('Configuración incompleta', creditsConfig.errorMessage ?? '');
          setIsProcessing(false);
          setStatusMessage(null);
          return;
        }

        const preview = await previewWalletCreditQrWithReservationFallback(
          parsed.payload,
          DEFAULT_CREDIT_AMOUNT,
        );

        if (preview.kind === 'error') {
          navigateToStatus('QR de créditos', preview.message);
          setIsProcessing(false);
          setStatusMessage(null);
          return;
        }

        if (preview.kind === 'reservation') {
          router.push({
            pathname: '/credits/reservation-preview',
            params: {
              reservationPayload: JSON.stringify({
                type: 'credit_reservation_qr',
                version: 1,
                token: parsed.payload.token,
              }),
              previewData: JSON.stringify(preview.data),
              rawScan: payload,
            },
          });
          return;
        }

        router.push({
          pathname: '/credits/preview',
          params: {
            walletPayload: JSON.stringify(parsed.payload),
            previewData: JSON.stringify(preview.data),
            rawScan: payload,
          },
        });
        return;
      }

      if (parsed.kind === 'member_qr') {
        if (!memberConfig.isValid) {
          navigateToStatus(
            'Configuración incompleta',
            memberConfig.errorMessage ??
              'Configurá EXPO_PUBLIC_VMSERVER_API_BASE_URL para validar socios.',
          );
          setIsProcessing(false);
          setStatusMessage(null);
          return;
        }

        setStatusMessage('Validando ingreso...');
        const result = await validateMemberQr(parsed.raw);
        navigateToResult(result);
        return;
      }

      navigateToStatus(
        'QR no reconocido',
        'Este código no corresponde a un QR de billetera, reserva o carnet de socio reconocido.',
      );
      setIsProcessing(false);
      setStatusMessage(null);
    },
    [creditsConfig.errorMessage, creditsConfig.isValid, isProcessing, memberConfig.errorMessage, memberConfig.isValid, navigateToResult, navigateToStatus, router],
  );

  if (!permission) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.centered}>
        <SafeAreaView style={styles.permissionContainer}>
          <ThemedText type="subtitle" style={styles.centerText}>
            Permiso de cámara
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            El scanner necesita acceso a la cámara para leer códigos QR.
          </ThemedText>
          <PrimaryButton label="Conceder permiso" onPress={requestPermission} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {isFocused ? (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            isProcessing
              ? undefined
              : ({ data }) => {
                  void handleScan(data);
                }
          }
        />
      ) : (
        <View style={styles.camera} />
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Scanner Villa Mitre
          </ThemedText>
          <PrimaryButton
            label="Configuración"
            variant="secondary"
            onPress={() => router.push('/settings')}
          />
        </View>

        {!creditsConfig.isValid ? (
          <ThemedView type="backgroundElement" style={styles.banner}>
            <ThemedText type="smallBold">Créditos no configurados</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {creditsConfig.errorMessage}
            </ThemedText>
          </ThemedView>
        ) : null}

        <View style={styles.footer}>
          {isProcessing ? (
            <ThemedView type="backgroundElement" style={styles.processingBanner}>
              <ActivityIndicator />
              <ThemedText type="smallBold">{statusMessage ?? 'Validando QR...'}</ThemedText>
            </ThemedView>
          ) : (
            <ThemedText style={styles.hint}>Escaneá QR de billetera o reserva</ThemedText>
          )}

          <PrimaryButton
            label="Ingresar DNI manualmente"
            variant="secondary"
            disabled={isProcessing}
            onPress={() => router.push('/manual')}
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
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  headerTitle: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    gap: Spacing.two,
  },
  hint: {
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  banner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 420,
  },
  centerText: {
    textAlign: 'center',
  },
});
