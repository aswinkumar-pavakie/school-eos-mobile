import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { useRescheduleOnlineClass } from '../hooks';
import { isValidDateInput, isValidTimeInput } from '../utils';

export function RescheduleOnlineClassScreen({ id }: { id: string }) {
  const router = useRouter();
  const reschedule = useRescheduleOnlineClass(id);

  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);

    if (!isValidDateInput(scheduledDate)) {
      setFormError('Date must be in YYYY-MM-DD format.');
      return;
    }
    if (!isValidTimeInput(startTime) || !isValidTimeInput(endTime)) {
      setFormError('Times must be in HH:mm 24-hour format.');
      return;
    }

    try {
      await reschedule.mutateAsync({ scheduledDate, startTime, endTime, reason: reason.trim() || undefined });
      router.back();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        Alert.alert('Something went wrong', 'Unable to reschedule this class. Please try again.');
      }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Reschedule Class</Text>

        <Field label="New date (YYYY-MM-DD)">
          <TextInput
            value={scheduledDate}
            onChangeText={setScheduledDate}
            style={styles.input}
            placeholder="2026-09-25"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <View style={styles.row}>
          <Field label="Start time (HH:mm)" style={styles.flexField}>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              style={styles.input}
              placeholder="10:00"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
          <Field label="End time (HH:mm)" style={styles.flexField}>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              style={styles.input}
              placeholder="11:00"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
        </View>

        <Field label="Reason (optional)">
          <TextInput
            value={reason}
            onChangeText={setReason}
            style={styles.input}
            placeholder="Reason for rescheduling"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <PrimaryButton label="Confirm reschedule" onPress={handleSubmit} loading={reschedule.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text },
  field: { gap: 6 },
  flexField: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.errorText },
});
