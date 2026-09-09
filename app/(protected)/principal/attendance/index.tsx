// Principal -> Attendance -- staff-attendance.controller.ts:
// @Roles('ADMIN', 'PRINCIPAL'), BOTH the roster read (GET /staff-attendance)
// and the bulk mark write (POST /staff-attendance/mark), no method-level
// narrowing on either -- confirmed by direct backend audit. This is a
// COMPLETELY DIFFERENT backend module than Vice Principal's own read-only
// "Attendance" screen (attendance-sessions.controller.ts, no PRINCIPAL grant
// there at all) -- do not confuse the two. The controller's own comment
// states this is "the one write action in this build where Principal has
// full parity with Admin rather than a narrowed, view-only role," reusing
// the exact same markBulk write path Admin's own web StaffAttendanceBoard
// already calls -- no new attendance engine.
//
// Select rows -> Mark Present / Mark Absent -> reason required (matches
// MarkStaffAttendanceDto server-side validation) -> one bulk POST for the
// whole selection, same shape Admin's web form already submits.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getStaffAttendanceRoster, markStaffAttendance, type StaffDailyStatusRow } from '@/lib/principal-attendance-api';
import { listGrades, listSections } from '@/lib/principal-students-api';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function statusMeta(status: string | null): { label: string; tone: StatusTone } {
  if (status === 'CHECK_IN') return { label: 'Present', tone: 'positive' };
  if (status === 'ABSENT') return { label: 'Absent', tone: 'negative' };
  return { label: 'Not marked', tone: 'neutral' };
}

export default function PrincipalAttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dateStr, setDateStr] = useState(() => toDateStr(new Date()));
  const [isTeaching, setIsTeaching] = useState<boolean | undefined>(undefined);
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingStatus, setPendingStatus] = useState<'PRESENT' | 'ABSENT' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const gradesQuery = useQuery({ queryKey: ['principal-attendance', 'grades'], queryFn: listGrades });
  const grade = useMemo(() => gradesQuery.data?.find((g) => g.name === gradeName) ?? null, [gradesQuery.data, gradeName]);
  const sectionsQuery = useQuery({
    queryKey: ['principal-attendance', 'sections', grade?.id],
    queryFn: () => listSections(grade?.id),
    enabled: !!grade,
  });
  const section = useMemo(
    () => sectionsQuery.data?.find((s) => s.name === sectionName) ?? null,
    [sectionsQuery.data, sectionName],
  );

  const rosterQuery = useQuery({
    queryKey: ['principal-attendance', 'roster', dateStr, isTeaching, grade?.id, section?.id],
    queryFn: () =>
      getStaffAttendanceRoster({ date: dateStr, isTeaching, gradeId: grade?.id, sectionId: section?.id }),
  });

  const roster = rosterQuery.data ?? [];

  function toggleSelect(staffId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  }

  function shiftDate(days: number) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    setDateStr(toDateStr(d));
    setSelected(new Set());
  }

  function startMark(status: 'PRESENT' | 'ABSENT') {
    setPendingStatus(status);
    setReason('');
    setSubmitError(null);
  }

  async function confirmMark() {
    if (!pendingStatus || selected.size === 0) return;
    if (!reason.trim()) {
      setSubmitError('A reason is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await markStaffAttendance({
        staffIds: Array.from(selected),
        date: dateStr,
        status: pendingStatus,
        reason: reason.trim(),
      });
      setSelected(new Set());
      setPendingStatus(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['principal-attendance', 'roster'] });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Unable to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Attendance" subtitle="Mark and review staff attendance" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.dateNav}>
          <Pressable style={styles.dateArrow} onPress={() => shiftDate(-1)}>
            <Ionicons name="chevron-back" size={18} color={parentColors.ink} />
          </Pressable>
          <Text style={styles.dateLabel}>{formatDate(dateStr)}</Text>
          <Pressable style={styles.dateArrow} onPress={() => shiftDate(1)}>
            <Ionicons name="chevron-forward" size={18} color={parentColors.ink} />
          </Pressable>
        </View>

        <View style={styles.statusRow}>
          {[
            { value: undefined, label: 'All' },
            { value: true, label: 'Teaching' },
            { value: false, label: 'Non-teaching' },
          ].map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setIsTeaching(opt.value)}
              style={[styles.statusChip, isTeaching === opt.value && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, isTeaching === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {isTeaching ? (
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Grade"
                value={gradeName}
                placeholder={gradesQuery.isLoading ? 'Loading…' : 'Any grade'}
                options={(gradesQuery.data ?? []).map((g) => g.name)}
                onSelect={(name) => {
                  setGradeName(name);
                  setSectionName(null);
                }}
                disabled={gradesQuery.isLoading}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Section"
                value={sectionName}
                placeholder={!grade ? 'Pick a grade first' : 'Any section'}
                options={(sectionsQuery.data ?? []).map((s) => s.name)}
                onSelect={setSectionName}
                disabled={!grade}
              />
            </View>
          </View>
        ) : null}

        {selected.size > 0 ? (
          <View style={styles.actionBar}>
            <Text style={styles.actionBarText}>{selected.size} selected</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={[styles.actionButton, styles.presentButton]} onPress={() => startMark('PRESENT')}>
                <Text style={styles.actionButtonText}>Mark present</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, styles.absentButton]} onPress={() => startMark('ABSENT')}>
                <Text style={styles.actionButtonText}>Mark absent</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {pendingStatus ? (
          <View style={styles.reasonCard}>
            <Text style={styles.reasonLabel}>
              Reason for marking {selected.size} staff as {pendingStatus === 'PRESENT' ? 'Present' : 'Absent'}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. School inspection duty"
              placeholderTextColor={parentColors.mutedLight}
              style={styles.reasonInput}
              multiline
            />
            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
                onPress={confirmMark}
                disabled={submitting}
              >
                <Text style={styles.confirmButtonText}>{submitting ? 'Submitting…' : 'Confirm'}</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setPendingStatus(null)} disabled={submitting}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {rosterQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : rosterQuery.isError ? (
          <ErrorState
            message={rosterQuery.error instanceof ApiError ? rosterQuery.error.message : 'Unable to load the roster.'}
            onRetry={() => rosterQuery.refetch()}
          />
        ) : roster.length === 0 ? (
          <EmptyState message="No active staff match this filter." />
        ) : (
          <View style={styles.list}>
            {roster.map((row: StaffDailyStatusRow, index: number) => {
              const meta = statusMeta(row.status);
              const isSelected = selected.has(row.staffId);
              return (
                <Pressable
                  key={row.staffId}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => toggleSelect(row.staffId)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {row.firstName} {row.lastName ?? ''}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {row.employeeNo}
                      {row.designation ? ` · ${row.designation}` : ''}
                      {row.status === 'CHECK_IN' && row.markedAt ? ` · ${formatTime(row.markedAt)}` : ''}
                    </Text>
                  </View>
                  <StatusBadge {...meta} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 4 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: parentColors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusChip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  statusChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  statusChipTextActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  actionBarText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  actionButton: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  presentButton: { backgroundColor: '#1E8A4C' },
  absentButton: { backgroundColor: '#B33A2E' },
  actionButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  reasonCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  reasonLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, marginBottom: 8 },
  reasonInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    minHeight: 44,
  },
  errorText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#B33A2E', marginTop: 6 },
  confirmButton: { flex: 1, backgroundColor: parentColors.blue, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: parentColors.border, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: parentColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  rowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
