// Step 1 of the self-service reset: request an OTP. Reachable from the login screen's
// "Forgot password?" link for anyone (the screen can't know the caller's role before
// login -- see the follow-up step-2 screen for what happens for non-Parent accounts,
// which the backend gates via reset_allowance_used regardless of who's asking).

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ApiError } from '@/lib/api';
import { requestPasswordReset } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = identifier.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(identifier.trim());
      router.push({ pathname: '/(auth)/reset-password', params: { identifier: identifier.trim() } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              Enter the email or mobile number on your account. We&apos;ll send a one-time code.
            </Text>

            <View style={styles.formWrapper}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  style={styles.input}
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Send code</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  title: { fontFamily: fonts.extraBold, fontSize: 26, color: colors.text },
  subtitle: { marginTop: 4, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  formWrapper: { marginTop: 24, gap: 20 },
  errorBanner: { backgroundColor: colors.errorBg, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.errorText },
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
