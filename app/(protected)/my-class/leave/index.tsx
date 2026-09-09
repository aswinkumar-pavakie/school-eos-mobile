// Parent-initiated Student Leave requests -- "Apply" (a from/to date range +
// reason, optionally skipping school transport for those days) and "History"
// (status of every request raised for the selected child). A parent can only
// create and view these, never decide them.
//
// From/to date are plain, strictly-validated "YYYY-MM-DD" text fields rather than
// a native date-picker -- this app has no date-picker dependency installed (see
// events/create.tsx's own note on why one hasn't been added), so this reuses that
// same established pattern for consistency.
//
// The design reference's dashed attachment box is deliberately not built here:
// there is no storage bucket wired for leave attachments yet (unlike Homework,
// which has its own dedicated bucket), so this screen never offers a picker/upload
// for it -- a documented, deliberate gap, not an oversight.

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path, Rect } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { createLeaveRequest, listLeaveRequests, type ParentChild, type StudentLeaveRequest } from '@/lib/parent-api';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { parentColors, cardShadow } from '@/lib/theme';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REASON_MAX_LENGTH = 200;

function isValidDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());
}

function leaveStatusMeta(state: StudentLeaveRequest['state']): { label: string; tone: StatusTone } {
  switch (state) {
    case 'PENDING':
      return { label: 'Pending', tone: 'warning' };
    case 'APPROVED':
      return { label: 'Approved', tone: 'positive' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    default:
      return { label: state, tone: 'neutral' };
  }
}

function CalendarIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#5B8BEE" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2.5} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
      <Path d="M5 12l5 5L19 7" />
    </Svg>
  );
}

function queryKeyFor(studentId: string) {
  return ['parent-leave-requests', studentId];
}

function ApplyTab({ selected, onSubmitted }: { selected: ParentChild; onSubmitted: () => void }) {
  const queryClient = useQueryClient();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [skipSchoolTransport, setSkipSchoolTransport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);

    const from = fromDate.trim();
    const to = toDate.trim();
    if (!isValidDate(from)) {
      setError('Enter a valid "From date" (YYYY-MM-DD).');
      return;
    }
    if (!isValidDate(to)) {
      setError('Enter a valid "To date" (YYYY-MM-DD).');
      return;
    }
    if (to < from) {
      setError('The "to" date must be on or after the "from" date.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setSubmitting(true);
    try {
      await createLeaveRequest({
        studentId: selected.studentId,
        fromDate: from,
        toDate: to,
        reason: reason.trim(),
        skipSchoolTransport,
      });
      queryClient.invalidateQueries({ queryKey: queryKeyFor(selected.studentId) });
      setFromDate('');
      setToDate('');
      setReason('');
      setSkipSchoolTransport(false);
      setSuccess(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.forStudent}>For {selected.studentName}</Text>

        <View style={styles.row}>
          <View style={styles.rowInput}>
            <Text style={styles.fieldLabel}>From date</Text>
            <View style={styles.dateBox}>
              <CalendarIcon />
              <TextInput
                style={styles.dateInput}
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={parentColors.mutedLight}
              />
            </View>
          </View>
          <View style={styles.rowInput}>
            <Text style={styles.fieldLabel}>To date</Text>
            <View style={styles.dateBox}>
              <CalendarIcon />
              <TextInput
                style={styles.dateInput}
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={parentColors.mutedLight}
              />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.fieldLabel}>
            Reason ({reason.length}/{REASON_MAX_LENGTH})
          </Text>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={(text) => setReason(text.slice(0, REASON_MAX_LENGTH))}
            placeholder="Why is this leave needed?"
            placeholderTextColor={parentColors.mutedLight}
            maxLength={REASON_MAX_LENGTH}
            multiline
          />
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setSkipSchoolTransport((v) => !v)}>
          <View style={[styles.checkbox, skipSchoolTransport ? styles.checkboxOn : styles.checkboxOff]}>
            {skipSchoolTransport ? <CheckIcon /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxTitle}>Also skip school transport</Text>
            <Text style={styles.checkboxHelper}>
              Bus will not stop for these days — the driver and class teacher are informed.
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Request submitted. Check the History tab for its status.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit request</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab({ selected, showSuccessBanner }: { selected: ParentChild; showSuccessBanner: boolean }) {
  const listQuery = useQuery({ queryKey: queryKeyFor(selected.studentId), queryFn: () => listLeaveRequests(selected.studentId) });
  const rows = listQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
    >
      {showSuccessBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Request sent to the class teacher</Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>RECENT REQUESTS</Text>

      {listQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : listQuery.isError ? (
        <ErrorState message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load requests.'} onRetry={() => listQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState message="No leave requests yet." />
      ) : (
        rows.map((request) => {
          const meta = leaveStatusMeta(request.state);
          return (
            <View key={request.id} style={styles.requestCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestDates}>
                  {formatDate(request.fromDate)} – {formatDate(request.toDate)}
                </Text>
                <Text style={styles.requestReason} numberOfLines={2}>
                  {request.reason}
                </Text>
              </View>
              <StatusBadge label={meta.label} tone={meta.tone} />
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

export default function LeaveScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const [tab, setTab] = useState<'apply' | 'history'>('apply');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  if (!selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Leave" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Leave" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'apply', label: 'Apply' },
          { key: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'apply' ? (
        <ApplyTab selected={selected} onSubmitted={() => setShowSuccessBanner(true)} />
      ) : (
        <HistoryTab selected={selected} showSuccessBanner={showSuccessBanner} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 15 },
  forStudent: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 1 },
  fieldLabel: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    backgroundColor: '#FAFBFE',
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    padding: 0,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: parentColors.bodyMuted,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    backgroundColor: '#FAFBFE',
    padding: 13,
    minHeight: 76,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.8,
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: parentColors.blueDeep, borderColor: parentColors.blueDeep },
  checkboxOff: { backgroundColor: '#fff', borderColor: parentColors.checkboxOff },
  checkboxTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  checkboxHelper: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginTop: 16 },
  success: { color: '#1E8A4C', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginTop: 16 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 18 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  banner: { backgroundColor: parentColors.pillBlueBg, borderRadius: 14, padding: 14 },
  bannerText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: parentColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  requestDates: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  requestReason: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
});
