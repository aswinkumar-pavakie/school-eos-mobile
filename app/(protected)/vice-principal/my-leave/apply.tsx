// Vice Principal -> Apply for leave (Phase 28) -- creates a REAL leave
// request via POST /staff/me/leave-requests, which routes through the
// existing generic approvals engine using the already-configured
// STAFF_LEAVE_REQUEST policy (single step, PRINCIPAL). Real leave types
// only (CASUAL/MEDICAL/EARNED/ON_DUTY, the table's own CHECK constraint) --
// no invented categories.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { SelectField } from '@/components/SelectField';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { createMyLeaveRequest, type StaffLeaveType } from '@/lib/vice-principal-my-leave-api';

const LEAVE_TYPE_VALUES: StaffLeaveType[] = ['CASUAL', 'MEDICAL', 'EARNED', 'ON_DUTY'];

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

const LEAVE_TYPE_OPTIONS = LEAVE_TYPE_VALUES.map(humanize);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VicePrincipalApplyLeaveScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [leaveType, setLeaveType] = useState<StaffLeaveType>('CASUAL');
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = reason.trim().length > 0 && toDate >= fromDate && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createMyLeaveRequest({ leaveType, fromDate, toDate, reason: reason.trim() });
      await queryClient.invalidateQueries({ queryKey: ['vp-my-leave'] });
      router.back();
    } catch (err) {
      Alert.alert('Could not submit request', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Apply for leave" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Leave type</Text>
        <SelectField
          label="Leave type"
          value={humanize(leaveType)}
          placeholder="Select leave type"
          options={LEAVE_TYPE_OPTIONS}
          onSelect={(label) => setLeaveType(LEAVE_TYPE_VALUES[LEAVE_TYPE_OPTIONS.indexOf(label)] ?? 'CASUAL')}
        />

        <Text style={styles.fieldLabel}>From date</Text>
        <DateSelectorPill
          date={fromDate}
          onChange={(d) => {
            setFromDate(d);
            if (toDate < d) setToDate(d);
          }}
        />

        <Text style={styles.fieldLabel}>To date</Text>
        <DateSelectorPill date={toDate} onChange={setToDate} />

        <Text style={styles.fieldLabel}>Reason</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Enter your reason…"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.textArea}
          multiline
        />

        <Pressable style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit request</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  fieldLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, marginTop: 16, marginBottom: 8 },
  textArea: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: '#fff' },
});
