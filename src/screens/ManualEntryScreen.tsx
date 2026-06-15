import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { validateConfig } from '@/constants/config';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { scanMemberAccess } from '@/services/memberAccessService';

export function ManualEntryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const config = validateConfig();

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError('Ingresá un DNI o código QR.');
      return;
    }

    if (!config.isValid) {
      setError(config.errorMessage ?? 'Configuración incompleta.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    const result = await scanMemberAccess(trimmed);
    router.push({
      pathname: '/result',
      params: { payload: JSON.stringify(result) },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.content}>
          <ThemedText type="subtitle">Ingreso manual</ThemedText>
          <ThemedText themeColor="textSecondary">
            Usá esta opción si el QR no se lee o el socio presenta solo su DNI.
          </ThemedText>

          <TextInput
            accessibilityLabel="DNI o código QR"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isProcessing}
            keyboardType="default"
            placeholder="DNI o contenido del QR"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
              },
            ]}
            value={value}
            onChangeText={(text) => {
              setValue(text);
              if (error) {
                setError(null);
              }
            }}
            onSubmitEditing={() => {
              void handleSubmit();
            }}
          />

          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          {!config.isValid ? (
            <ThemedView type="backgroundElement" style={styles.banner}>
              <ThemedText type="small" themeColor="textSecondary">
                {config.errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          <PrimaryButton
            label="Validar ingreso"
            loading={isProcessing}
            onPress={() => {
              void handleSubmit();
            }}
          />
          <PrimaryButton
            label="Volver al escáner"
            variant="secondary"
            disabled={isProcessing}
            onPress={() => router.back()}
          />
        </KeyboardAvoidingView>
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
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  errorText: {
    color: '#DC2626',
  },
  banner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
