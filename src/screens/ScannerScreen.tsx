import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { validateConfig } from '@/constants/config';
import { Spacing } from '@/constants/theme';
import { scanMemberAccess } from '@/services/memberAccessService';
import type { MemberAccessScanResponse } from '@/types/scanner';

const SCAN_DEBOUNCE_MS = 2_500;

export function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(true);
  const lastScanRef = useRef<{ payload: string; timestamp: number } | null>(null);

  const config = validateConfig();

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
      setStatusMessage('Validando ingreso...');

      const result = await scanMemberAccess(payload);
      navigateToResult(result);
    },
    [isProcessing, navigateToResult],
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
            CheckSocios necesita acceso a la cámara para escanear códigos QR de socios.
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
            isProcessing || !config.isValid
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
            CheckSocios 2.0
          </ThemedText>
          <PrimaryButton
            label="Configuración"
            variant="secondary"
            onPress={() => router.push('/settings')}
          />
        </View>

        {!config.isValid ? (
          <ThemedView type="backgroundElement" style={styles.banner}>
            <ThemedText type="smallBold">Configuración incompleta</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {config.errorMessage}
            </ThemedText>
          </ThemedView>
        ) : null}

        <View style={styles.footer}>
          {isProcessing ? (
            <ThemedView type="backgroundElement" style={styles.processingBanner}>
              <ActivityIndicator />
              <ThemedText type="smallBold">{statusMessage ?? 'Validando...'}</ThemedText>
            </ThemedView>
          ) : (
            <ThemedText style={styles.hint}>Apuntá al código QR del socio</ThemedText>
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
    ...StyleSheet.absoluteFill,
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
