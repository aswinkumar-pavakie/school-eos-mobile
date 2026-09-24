// "Add account" popup (Faculty login only): the class login's EMAIL and PASSWORD. The
// backend signs it in only if the administrator mapped that class to this teacher, and
// answers "unknown email", "not your class" and "wrong password" identically on purpose.
// Once added on this phone, switching needs no password (see AccountSwitcherModal).
// Design: school-eos-website/rnd-linked-account-switching.md.

import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { addClassAccount } from '@/lib/auth';
import { goHome } from '@/lib/go-home';
import { colors, fonts } from '@/lib/theme';

export function AddAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSubmitting;

  function close() {
    if (isSubmitting) return;
    setIdentifier('');
    setPassword('');
    setError(null);
    onClose();
  }

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await addClassAccount(identifier.trim(), password);
      queryClient.clear();
      setIdentifier('');
      setPassword('');
      onClose();
      goHome(router);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? 'Those login details are not correct, or that class is not assigned to you.'
            : err.message,
        );
      } else {
        setError('Could not add the account. Check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.card}>
          <Text style={styles.title}>Add account</Text>
          <Text style={styles.subtitle}>
            Enter the email and password of your class teacher login. It is added only if the administrator assigned
            that class to you. You do this once on this phone; after that you can switch without a password.
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
              editable={!isSubmitting}
              placeholder="class teacher login email"
              placeholderTextColor={colors.textMuted}
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
              editable={!isSubmitting}
              placeholder="class teacher login password"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              onSubmitEditing={submit}
            />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={submit} disabled={!canSubmit} style={[styles.button, !canSubmit && styles.buttonDisabled]}>
              {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Add account</Text>}
            </Pressable>
            <Pressable onPress={close} disabled={isSubmitting} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 22, gap: 14 },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  errorBanner: { backgroundColor: colors.errorBg, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  errorText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.errorText },
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.text },
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
  actions: { gap: 6, marginTop: 4 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  cancel: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
});
