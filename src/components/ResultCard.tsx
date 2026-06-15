import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScanStatusColors, Spacing } from '@/constants/theme';
import type { MemberAccessScanResponse, ScanStatus } from '@/types/scanner';

type ResultCardProps = {
  result: MemberAccessScanResponse;
};

function getStatusPresentation(status: ScanStatus) {
  switch (status) {
    case 'allowed':
    case 'approved':
      return {
        accent: ScanStatusColors.allowed,
        label: 'Puede ingresar',
      };
    case 'allowed_with_warning':
      return {
        accent: ScanStatusColors.warning,
        label: 'Puede ingresar con deuda',
      };
    case 'rejected':
      return {
        accent: ScanStatusColors.rejected,
        label: 'No puede ingresar',
      };
    case 'expired':
    case 'already_used':
    case 'invalid':
    case 'error':
    default:
      return {
        accent: ScanStatusColors.neutral,
        label: 'Revisar ingreso',
      };
  }
}

function formatMetadataValue(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

export function ResultCard({ result }: ResultCardProps) {
  const presentation = getStatusPresentation(result.status);
  const semaforo = formatMetadataValue(result.metadata?.semaforo);
  const saldo = formatMetadataValue(result.metadata?.saldo);
  const ultImpago = formatMetadataValue(result.metadata?.ult_impago);

  return (
    <ThemedView style={styles.card}>
      <View style={[styles.statusBar, { backgroundColor: presentation.accent }]} />
      <View style={styles.content}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {presentation.label}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          {result.title}
        </ThemedText>
        <ThemedText style={styles.message}>{result.message}</ThemedText>

        {result.person?.name ? (
          <ThemedText style={styles.detail}>
            <ThemedText type="smallBold">Nombre: </ThemedText>
            {result.person.name}
          </ThemedText>
        ) : null}

        {result.person?.dni ? (
          <ThemedText style={styles.detail}>
            <ThemedText type="smallBold">DNI: </ThemedText>
            {result.person.dni}
          </ThemedText>
        ) : null}

        {semaforo ? (
          <ThemedText style={styles.detail}>
            <ThemedText type="smallBold">Semáforo: </ThemedText>
            {semaforo}
          </ThemedText>
        ) : null}

        {saldo ? (
          <ThemedText style={styles.detail}>
            <ThemedText type="smallBold">Saldo: </ThemedText>
            {saldo}
          </ThemedText>
        ) : null}

        {ultImpago ? (
          <ThemedText style={styles.detail}>
            <ThemedText type="smallBold">Últ. impago: </ThemedText>
            {ultImpago}
          </ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  statusBar: {
    height: 6,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  message: {
    lineHeight: 22,
  },
  detail: {
    lineHeight: 22,
  },
});
