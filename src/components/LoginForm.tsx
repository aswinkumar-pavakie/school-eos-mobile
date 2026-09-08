import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { login, PlatformNotAllowedError } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      // A previous account's cached queries (its ['me'] role data especially)
      // must never survive into this new session -- without this, switching
      // accounts on the same device within useMe()'s 5-minute staleTime shows
      // the PREVIOUS person's role/screens until that cache naturally expires
      // (confirmed live: logging in as Vice Principal after Community showed
      // Community's own Home screen). Clear everything, not just ['me'] --
      // any other cached business data is equally stale for a new identity.
      queryClient.clear();
      // Per-role home destinations aren't built yet (feature teams own those screens
      // individually); every role lands on the single protected placeholder for now.
      router.replace('/(protected)');
    } catch (err) {
      if (err instanceof PlatformNotAllowedError) {
        setError(err.message);
      } else {
        // Pass the backend's message through unchanged -- never rephrase it, never
        // distinguish wrong-password from unknown-identifier or lockout.
        setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
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
          autoComplete="username"
          editable={!isSubmitting}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          editable={!isSubmitting}
          style={styles.input}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
      </Pressable>

      <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
        Forgot password?
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 20,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.errorText,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },
  forgotLink: {
    alignSelf: 'center',
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },
});
