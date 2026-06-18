import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type StatusRouteParams = {
  title?: string;
  message?: string;
};

export function ScannerStatusScreen() {
  const router = useRouter();
  const { title, message } = useLocalSearchParams<StatusRouteParams>();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">{title ?? 'Resultado del escaneo'}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {message ?? 'No hay información adicional.'}
          </ThemedText>
        </View>

        <PrimaryButton label="Escanear otro" onPress={() => router.replace('/')} />
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
    gap: Spacing.two,
  },
});
