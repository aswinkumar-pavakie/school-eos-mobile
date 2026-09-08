// Shared screen body for Parent-initiated Gate Pass and Emergency Exit requests --
// both create an outing_request on the backend with near-identical fields (see
// CreateGatePassRequestDto/CreateEmergencyExitRequestDto), differing only in
// whether destination/isOvernight apply. Two tabs: "New request" (form) and
// "History" (read-only list with status -- a parent can create and view their own
// requests, never decide them; no accept/decline anywhere on this screen).

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { OutingRequestRow } from '@/lib/hostel-warden-api';
import { fullName, outingRequestStatusMeta } from '@/lib/hostel-warden-status';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { parentColors, cardShadow } from '@/lib/theme';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function combineIso(dateStr: string, timeStr: string): string | null {
  if (!DATE_PATTERN.test(dateStr.trim()) || !TIME_PATTERN.test(timeStr.trim())) return null;
  const date = new Date(`${dateStr.trim()}T${timeStr.trim()}:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

interface CreateInput {
  studentId: string;
  outFrom: string;
  expectedReturn: string;
  reason: string;
  destination?: string;
  isOvernight?: boolean;
}

export function ParentOutingRequestScreen({
  title,
  subtitle,
  queryKey,
  listFn,
  createFn,
  showDestination,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  queryKey: string;
  listFn: () => Promise<OutingRequestRow[]>;
  createFn: (input: CreateInput) => Promise<OutingRequestRow>;
  showDestination: boolean;
  emptyMessage: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'new' | 'history'>('new');

  return (
    <View style={styles.flex}>
      <AppHeader title={title} subtitle={subtitle} onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'new', label: 'New request' },
          { key: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'new' ? (
        <NewRequestTab queryKey={queryKey} createFn={createFn} showDestination={showDestination} />
      ) : (
        <HistoryTab queryKey={queryKey} listFn={listFn} emptyMessage={emptyMessage} />
      )}
    </View>
  );
}

function NewRequestTab({
  queryKey,
  createFn,
  showDestination,
}: {
  queryKey: string;
  createFn: (input: CreateInput) => Promise<OutingRequestRow>;
  showDestination: boolean;
}) {
  const queryClient = useQueryClient();
  const { selected } = useSelectedChild();

  const [outDate, setOutDate] = useState('');
  const [outTime, setOutTime] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
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
    const outFrom = combineIso(outDate, outTime);
    const expectedReturn = combineIso(returnDate, returnTime);
    if (!outFrom || !expectedReturn) {
      setError('Enter valid dates (YYYY-MM-DD) and times (HH:MM, 24-hour).');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setSubmitting(true);
    try {
      await createFn({
        studentId: selected.studentId,
        outFrom,
        expectedReturn,
        reason: reason.trim(),
        destination: showDestination ? destination.trim() || undefined : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['parent-hostel', queryKey] });
      setOutDate('');
      setOutTime('');
      setReturnDate('');
      setReturnTime('');
      setReason('');
      setDestination('');
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
        {selected ? (
          <Text style={styles.forStudent}>For {selected.studentName}</Text>
        ) : (
          <Text style={styles.error}>No child linked to your account.</Text>
        )}

        <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Out from</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={outDate} onChangeText={setOutDate} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
          <TextInput style={[styles.input, styles.rowInput]} value={outTime} onChangeText={setOutTime} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Expected return</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={returnDate} onChangeText={setReturnDate} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
          <TextInput style={[styles.input, styles.rowInput]} value={returnTime} onChangeText={setReturnTime} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Field label="Reason">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={reason}
              onChangeText={setReason}
              placeholder="Why is this outing needed?"
              placeholderTextColor={parentColors.mutedLight}
              multiline
            />
          </Field>
        </View>

        {showDestination ? (
          <Field label="Destination (optional)">
            <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="e.g. Home" placeholderTextColor={parentColors.mutedLight} />
          </Field>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Request submitted. Check the History tab for its status.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit request</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab({
  queryKey,
  listFn,
  emptyMessage,
}: {
  queryKey: string;
  listFn: () => Promise<OutingRequestRow[]>;
  emptyMessage: string;
}) {
  const { selected } = useSelectedChild();
  const listQuery = useQuery({ queryKey: ['parent-hostel', queryKey], queryFn: listFn });
  // The backend scopes this list by "requested_by = me" (every request this
  // parent has ever raised, across every one of their children) -- filtered here
  // to just the currently-selected child, so a parent with more than one linked
  // child doesn't see another child's requests mixed into this history.
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
        <EmptyState message={emptyMessage} />
      ) : (
        rows.map((request) => {
          const meta = outingRequestStatusMeta(request.state);
          return (
            <View key={request.id} style={[styles.card, cardShadow]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {fullName(request.studentFirstName, request.studentLastName)}
                  </Text>
                  <Text style={styles.reason} numberOfLines={2}>
                    {request.reason}
                  </Text>
                </View>
                <StatusBadge label={meta.label} tone={meta.tone} />
              </View>
              <Text style={styles.meta}>Out: {formatDateTime(request.outFrom)}</Text>
              <Text style={styles.meta}>Expected return: {formatDateTime(request.expectedReturn)}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  reason: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, marginTop: 2 },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  success: { color: '#1E8A4C', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
