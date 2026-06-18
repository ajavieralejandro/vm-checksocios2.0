import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  appVersion,
  creditsApiBaseUrl,
  scannerApiToken,
  scannerPoint,
  validateCreditsConfig,
  validateMemberConfig,
  vmServerApiBaseUrl,
} from '@/config/env';
import { Spacing } from '@/constants/theme';

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText selectable>{value}</ThemedText>
    </ThemedView>
  );
}

function maskToken(token: string | undefined): string {
  if (!token) {
    return '(no configurado)';
  }

  if (token.length <= 8) {
    return '********';
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function SettingsScreen() {
  const router = useRouter();
  const creditsConfig = validateCreditsConfig();
  const memberConfig = validateMemberConfig();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Configuración</ThemedText>
          <ThemedText themeColor="textSecondary">
            Valores de entorno para operadores internos. No se editan desde la app en esta fase.
          </ThemedText>

          {!creditsConfig.isValid ? (
            <ThemedView style={styles.warningBox}>
              <ThemedText type="smallBold">Créditos</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {creditsConfig.errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          {!memberConfig.isValid ? (
            <ThemedView style={styles.warningBox}>
              <ThemedText type="smallBold">Socios / vmServer</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {memberConfig.errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedText type="smallBold">Créditos (vm-creditos-api)</ThemedText>
          <ConfigRow
            label="Credits API base URL"
            value={creditsApiBaseUrl ?? '(no configurada)'}
          />
          <ConfigRow label="Scanner API token" value={maskToken(scannerApiToken)} />

          <ThemedText type="smallBold">Socios (vmServer)</ThemedText>
          <ConfigRow
            label="vmServer API base URL"
            value={vmServerApiBaseUrl ?? '(no configurada)'}
          />
          <ConfigRow label="Punto de acceso" value={scannerPoint} />
          <ConfigRow label="Versión de la app" value={appVersion} />
        </ScrollView>

        <PrimaryButton label="Volver al escáner" onPress={() => router.back()} />
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
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  warningBox: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
    backgroundColor: '#FEF3C7',
  },
});
