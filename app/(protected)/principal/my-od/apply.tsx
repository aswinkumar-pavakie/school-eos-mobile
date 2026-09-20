// Principal -> Apply for OD -- same real POST /staff/me/leave-requests as My
// Leave's own apply screen, leaveType hardcoded to 'ON_DUTY' and no type
// picker shown (this screen exists only to file on-duty requests). "Place of
// duty" has no dedicated column on staff_leave_request -- folded into the
// real `reason` free-text field the schema actually has, same honest-fold
// pattern already used elsewhere in this project rather than inventing a
// column.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { ApiError } from '@/lib/api';
import { principalColors } from '@/lib/theme';
import { createMyLeaveRequest } from '@/lib/principal-my-leave-api';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PrincipalApplyODScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [placeOfDuty, setPlaceOfDuty] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = placeOfDuty.trim().length > 0 && purpose.trim().length > 0 && toDate >= fromDate && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createMyLeaveRequest({
        leaveType: 'ON_DUTY',
        fromDate,
        toDate,
        reason: `Place of duty: ${placeOfDuty.trim()}. Purpose: ${purpose.trim()}`,
      });
      await queryClient.invalidateQueries({ queryKey: ['principal-my-leave'] });
      router.back();
    } catch (err) {
      Alert.alert('Could not submit request', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="Apply for OD" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <Text style={styles.fieldLabel}>Place of duty</Text>
        <TextInput
          value={placeOfDuty}
          onChangeText={setPlaceOfDuty}
          placeholder="e.g. District Education Office"
          placeholderTextColor={principalColors.disabled}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Purpose</Text>
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder="Enter the purpose of duty…"
          placeholderTextColor={principalColors.disabled}
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
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  fieldLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.muted, marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: principalColors.borderSoft,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: principalColors.ink,
  },
  textArea: {
    borderWidth: 1,
    borderColor: principalColors.borderSoft,
    borderRadius: 12,
    padding: 13,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: principalColors.ink,
  },
  submitButton: { backgroundColor: principalColors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitButtonDisabled: { backgroundColor: principalColors.disabled },
  submitButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: '#fff' },
});
