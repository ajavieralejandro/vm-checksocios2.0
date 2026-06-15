import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  apiBaseUrl,
  appVersion,
  scannerPoint,
  validateConfig,
} from '@/constants/config';
import { Spacing } from '@/constants/theme';

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText selectable>{value}</ThemedText>
    </ThemedView>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const config = validateConfig();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Configuración</ThemedText>
          <ThemedText themeColor="textSecondary">
            Valores de entorno para operadores internos. No se editan desde la app en esta fase.
          </ThemedText>

          {!config.isValid ? (
            <ThemedView style={styles.warningBox}>
              <ThemedText type="smallBold">Advertencia</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {config.errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ConfigRow
            label="API base URL"
            value={apiBaseUrl ?? '(no configurada)'}
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
