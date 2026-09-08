// Plain validated text fields, not a native date-picker -- same reasoning as
// events/create.tsx (no date-picker dependency in this app, and adding one just
// for this field isn't worth the native-module risk).

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ApiError } from '@/lib/api';
import { createStudySession } from '@/lib/hostel-warden-api';
import { parentColors, cardShadow } from '@/lib/theme';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function CreateStudySessionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!DATE_PATTERN.test(sessionDate.trim())) {
      setError('Enter a valid date (YYYY-MM-DD).');
      return;
    }
    if (!TIME_PATTERN.test(startTime.trim()) || !TIME_PATTERN.test(endTime.trim())) {
      setError('Enter valid start/end times (HH:MM, 24-hour).');
      return;
    }
    if (startTime.trim() >= endTime.trim()) {
      setError('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      await createStudySession({ sessionDate: sessionDate.trim(), startTime: startTime.trim(), endTime: endTime.trim() });
      queryClient.invalidateQueries({ queryKey: ['hostel-warden', 'study-sessions'] });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the session.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="New study session" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow]}>
          <Field label="Date">
            <TextInput
              style={styles.input}
              value={sessionDate}
              onChangeText={setSessionDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={parentColors.mutedLight}
            />
          </Field>
          <Field label="Start time">
            <TextInput
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:MM (e.g. 19:00)"
              placeholderTextColor={parentColors.mutedLight}
            />
          </Field>
          <Field label="End time">
            <TextInput
              style={styles.input}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:MM (e.g. 21:00)"
              placeholderTextColor={parentColors.mutedLight}
            />
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create session</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  fieldLabel: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
