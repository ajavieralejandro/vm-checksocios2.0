import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ResultCard } from '@/components/ResultCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MemberAccessScanResponse } from '@/types/scanner';

function parseResultPayload(payload: string | string[] | undefined): MemberAccessScanResponse | null {
  const raw = Array.isArray(payload) ? payload[0] : payload;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MemberAccessScanResponse;
  } catch {
    return null;
  }
}

export function ResultScreen() {
  const router = useRouter();
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const result = parseResultPayload(payload);

  if (!result) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">Resultado no disponible</ThemedText>
          <ThemedText themeColor="textSecondary">
            No se recibió información de validación. Volvé al escáner e intentá de nuevo.
          </ThemedText>
          <PrimaryButton label="Escanear de nuevo" onPress={() => router.replace('/')} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Resultado de ingreso</ThemedText>
          <ResultCard result={result} />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Escanear de nuevo" onPress={() => router.replace('/')} />
          <PrimaryButton
            label="Ingresar DNI manualmente"
            variant="secondary"
            onPress={() => router.replace('/manual')}
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
  actions: {
    gap: Spacing.two,
  },
});
