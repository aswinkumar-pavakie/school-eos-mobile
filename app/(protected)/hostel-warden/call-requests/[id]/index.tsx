// Approve requires an explicit time window (ApproveCallRequestDto), pre-filled
// from the parent's own requested window but editable -- same plain validated
// date/time text-field convention as events/create.tsx (no date-picker dependency).
// Reject takes no reason on this backend (unlike Gate Pass/Emergency Exit's
// RejectApprovalDto) -- a plain confirm, not a text prompt, since inventing a field
// the DTO doesn't have would silently diverge from the real contract.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { approveCallRequest, getCallRequest, rejectCallRequest } from '@/lib/hostel-warden-api';
import { callRequestStatusMeta, fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(dateStr: string, timeStr: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
  if (!dateMatch || !timeMatch) return null;
  const [, y, mo, d] = dateMatch;
  const [, h, mi] = timeMatch;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function CallRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const queryKey = ['hostel-warden', 'call-request', id];
  const detailQuery = useQuery({ queryKey, queryFn: () => getCallRequest(id!), enabled: !!id });

  // null = "the Warden hasn't touched this field yet" -- displayed value falls back
  // to the parent's own requested date/time (derived straight from the query result
  // during render, not copied into state via an effect -- see
  // https://react.dev/learn/you-might-not-need-an-effect). Once the Warden edits a
  // field, their override takes over for that field only.
  const [fromDateOverride, setFromDateOverride] = useState<string | null>(null);
  const [fromTimeOverride, setFromTimeOverride] = useState<string | null>(null);
  const [toDateOverride, setToDateOverride] = useState<string | null>(null);
  const [toTimeOverride, setToTimeOverride] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fromDate = fromDateOverride ?? (detailQuery.data ? isoToLocalDate(detailQuery.data.requestedFrom) : '');
  const fromTime = fromTimeOverride ?? (detailQuery.data ? isoToLocalTime(detailQuery.data.requestedFrom) : '');
  const toDate = toDateOverride ?? (detailQuery.data ? isoToLocalDate(detailQuery.data.requestedTo) : '');
  const toTime = toTimeOverride ?? (detailQuery.data ? isoToLocalTime(detailQuery.data.requestedTo) : '');

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['hostel-warden', 'call-requests'] });
  }

  const approveMutation = useMutation({
    mutationFn: (window: { approvedFrom: string; approvedTo: string }) => approveCallRequest(id!, window),
    onSuccess: invalidateAll,
    onError: (err) => {
      Alert.alert('Could not approve', err instanceof ApiError ? err.message : 'Please try again.');
      invalidateAll();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectCallRequest(id!),
    onSuccess: invalidateAll,
    onError: (err) => {
      Alert.alert('Could not reject', err instanceof ApiError ? err.message : 'Please try again.');
      invalidateAll();
    },
  });

  function handleApprove() {
    setFormError(null);
    const approvedFrom = localToIso(fromDate, fromTime);
    const approvedTo = localToIso(toDate, toTime);
    if (!approvedFrom || !approvedTo) {
      setFormError('Enter valid dates (YYYY-MM-DD) and times (HH:MM, 24-hour).');
      return;
    }
    if (new Date(approvedTo).getTime() <= new Date(approvedFrom).getTime()) {
      setFormError('The "to" time must be after the "from" time.');
      return;
    }
    Alert.alert('Approve this call request?', `Allowed window:\n${fromDate} ${fromTime} – ${toDate} ${toTime}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approveMutation.mutate({ approvedFrom, approvedTo }) },
    ]);
  }

  function confirmReject() {
    Alert.alert('Reject this call request?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate() },
    ]);
  }

  const request = detailQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title="Call Request" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {detailQuery.isLoading || !request ? (
          detailQuery.isError ? (
            <ErrorState
              message={detailQuery.error instanceof ApiError ? detailQuery.error.message : 'Unable to load this request.'}
              onRetry={() => detailQuery.refetch()}
            />
          ) : (
            <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
          )
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
              <View style={styles.headerRow}>
                <Text style={styles.studentName}>{fullName(request.studentFirstName, request.studentLastName)}</Text>
                <StatusBadge {...callRequestStatusMeta(request.status)} />
              </View>
              <Text style={styles.rowLabel}>Requested window</Text>
              <Text style={styles.rowValue}>
                {formatDateTime(request.requestedFrom)} – {formatDateTime(request.requestedTo)}
              </Text>
              {request.status === 'APPROVED' && request.approvedFrom && request.approvedTo ? (
                <>
                  <Text style={[styles.rowLabel, { marginTop: 12 }]}>Approved window</Text>
                  <Text style={styles.rowValue}>
                    {formatDateTime(request.approvedFrom)} – {formatDateTime(request.approvedTo)}
                  </Text>
                </>
              ) : null}
            </View>

            {request.status === 'PENDING' ? (
              <View style={[styles.card, cardShadow]}>
                <Text style={styles.formTitle}>Set allowed time window</Text>
                <View style={styles.row}>
                  <TextInput style={[styles.input, styles.rowInput]} value={fromDate} onChangeText={setFromDateOverride} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
                  <TextInput style={[styles.input, styles.rowInput]} value={fromTime} onChangeText={setFromTimeOverride} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
                </View>
                <Text style={[styles.rowLabel, { marginTop: 12, marginBottom: 6 }]}>To</Text>
                <View style={styles.row}>
                  <TextInput style={[styles.input, styles.rowInput]} value={toDate} onChangeText={setToDateOverride} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
                  <TextInput style={[styles.input, styles.rowInput]} value={toTime} onChangeText={setToTimeOverride} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
                </View>
                {formError ? <Text style={styles.error}>{formError}</Text> : null}

                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.rejectButton}
                    onPress={confirmReject}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? (
                      <ActivityIndicator color="#B33A2E" />
                    ) : (
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.approveButton}
                    onPress={handleApprove}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.approveButtonText}>Approve</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  studentName: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, flex: 1 },
  rowLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: parentColors.mutedLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowValue: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, marginTop: 3 },
  formTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginTop: 10 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  rejectButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F3C3BC',
    backgroundColor: '#FDECEA',
  },
  rejectButtonText: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
  approveButton: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: parentColors.blue },
  approveButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
});
