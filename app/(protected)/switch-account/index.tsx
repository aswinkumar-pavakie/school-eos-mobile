// Faculty <-> Class Teacher account switch. If a linked identity is already
// stored (src/lib/auth.ts's switchToLinkedIdentity), this screen swaps
// instantly with no form shown at all. Otherwise it's a first-time
// credential entry for the OTHER identity's own login (Admin communicates
// that email/password to the faculty member out of band, same as the
// existing Academic Coordinator login) -- see linkAndSwitchIdentity.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import {
  PlatformNotAllowedError,
  getActiveIdentityLabel,
  hasLinkedIdentity,
  linkAndSwitchIdentity,
  switchToLinkedIdentity,
  type IdentityLabel,
} from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

function otherLabel(label: IdentityLabel | null): string {
  if (label === 'FACULTY') return 'Class Teacher';
  if (label === 'CLASS_TEACHER') return 'Faculty';
  return 'the other';
}

export default function SwitchAccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeLabel, setActiveLabel] = useState<IdentityLabel | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function finishSwitch() {
    queryClient.clear();
    router.replace('/(protected)');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [linked, label] = await Promise.all([hasLinkedIdentity(), getActiveIdentityLabel()]);
      if (cancelled) return;
      setActiveLabel(label);
      if (linked) {
        const switched = await switchToLinkedIdentity();
        if (cancelled) return;
        if (switched) {
          await finishSwitch();
          return;
        }
      }
      setShowForm(true);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await linkAndSwitchIdentity(identifier.trim(), password);
      await finishSwitch();
    } catch (err) {
      if (err instanceof PlatformNotAllowedError) {
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!showForm) return null;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Switch to {otherLabel(activeLabel)}</Text>
      <Text style={styles.subtitle}>
        Sign in with your {otherLabel(activeLabel)} login once -- after this, switching back and forth won&apos;t ask
        for a password again.
      </Text>

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

      <Pressable onPress={handleSubmit} disabled={!canSubmit} style={[styles.button, !canSubmit && styles.buttonDisabled]}>
        {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Switch</Text>}
      </Pressable>

      <Pressable onPress={() => router.back()} disabled={isSubmitting}>
        <Text style={styles.cancelLink}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  screen: { flex: 1, padding: 24, gap: 20, backgroundColor: colors.surface },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  errorBanner: { backgroundColor: colors.errorBg, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.errorText },
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
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
  cancelLink: { alignSelf: 'center', fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
});
