// Parent-initiated Parent Call Request -- two tabs: "New request" (pick a time
// window to request) and "History" (status + the Warden's approved window, once
// decided). No actual calling anywhere here -- this only controls the
// request/approval, matching the backend's own scope.

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { createCallRequest, listMyCallRequests } from '@/lib/parent-hostel-api';
import { callRequestStatusMeta, fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

const QUERY_KEY = ['parent-hostel', 'call-requests'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function combineIso(dateStr: string, timeStr: string): string | null {
  if (!DATE_PATTERN.test(dateStr.trim()) || !TIME_PATTERN.test(timeStr.trim())) return null;
  const date = new Date(`${dateStr.trim()}T${timeStr.trim()}:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function NewRequestTab() {
  const queryClient = useQueryClient();
  const { selected } = useSelectedChild();

  const [fromDate, setFromDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toDate, setToDate] = useState('');
  const [toTime, setToTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!selected) {
      setError('No child linked to your account.');
      return;
    }
    const requestedFrom = combineIso(fromDate, fromTime);
    const requestedTo = combineIso(toDate, toTime);
    if (!requestedFrom || !requestedTo) {
      setError('Enter valid dates (YYYY-MM-DD) and times (HH:MM, 24-hour).');
      return;
    }
    if (new Date(requestedTo).getTime() <= new Date(requestedFrom).getTime()) {
      setError('The "to" time must be after the "from" time.');
      return;
    }

    setSubmitting(true);
    try {
      await createCallRequest({ studentId: selected.studentId, requestedFrom, requestedTo });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setFromDate('');
      setFromTime('');
      setToDate('');
      setToTime('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, cardShadow]}>
        {selected ? <Text style={styles.forStudent}>For {selected.studentName}</Text> : <Text style={styles.error}>No child linked to your account.</Text>}

        <Text style={styles.fieldLabel}>Requested from</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
          <TextInput style={[styles.input, styles.rowInput]} value={fromTime} onChangeText={setFromTime} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Requested to</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
          <TextInput style={[styles.input, styles.rowInput]} value={toTime} onChangeText={setToTime} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Request submitted. Check the History tab for its status.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit request</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab() {
  const { selected } = useSelectedChild();
  const listQuery = useQuery({ queryKey: QUERY_KEY, queryFn: listMyCallRequests });
  // Same reasoning as ParentOutingRequestScreen's HistoryTab: the backend scopes
  // this list by "parent_person_id = me" (every request across every linked
  // child), filtered here to just the currently-selected child.
  const rows = (listQuery.data ?? []).filter((r) => !selected || r.studentId === selected.studentId);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
    >
      {listQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : listQuery.isError ? (
        <ErrorState message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load requests.'} onRetry={() => listQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState message="No call requests yet." />
      ) : (
        rows.map((request) => {
          const meta = callRequestStatusMeta(request.status);
          return (
            <View key={request.id} style={[styles.card, cardShadow]}>
              <View style={styles.cardTop}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {fullName(request.studentFirstName, request.studentLastName)}
                </Text>
                <StatusBadge {...meta} />
              </View>
              <Text style={styles.meta}>
                Requested: {formatDateTime(request.requestedFrom)} – {formatDateTime(request.requestedTo)}
              </Text>
              {request.status === 'APPROVED' && request.approvedFrom && request.approvedTo ? (
                <Text style={styles.approvedWindow}>
                  Approved: {formatDateTime(request.approvedFrom)} – {formatDateTime(request.approvedTo)}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

export default function ParentCallRequestsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'new' | 'history'>('new');

  return (
    <View style={styles.flex}>
      <AppHeader title="Parent Call Requests" subtitle="Request a time to speak with your child" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'new', label: 'New request' },
          { key: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'new' ? <NewRequestTab /> : <HistoryTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, flex: 1 },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight },
  approvedWindow: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep, marginTop: 4 },
  forStudent: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep, marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginTop: 12 },
  success: { color: '#1E8A4C', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginTop: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
