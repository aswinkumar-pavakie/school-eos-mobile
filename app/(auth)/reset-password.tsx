// Step 2 of the self-service reset: OTP + new password.

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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '@/lib/api';
import { completePasswordReset } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !!identifier && otp.trim().length > 0 && newPassword.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!identifier || !canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await completePasswordReset(identifier, otp.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Password reset</Text>
            <Text style={styles.subtitle}>Your password has been changed. Sign in with your new password.</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} style={[styles.button, styles.buttonSpaced]}>
              <Text style={styles.buttonText}>Back to sign in</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Enter code</Text>
            <Text style={styles.subtitle}>We sent a code to the mobile number on file for {identifier}.</Text>

            <View style={styles.formWrapper}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>One-time code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>New password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
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
                  <Text style={styles.buttonText}>Reset password</Text>
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
  buttonSpaced: { marginTop: 24 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
