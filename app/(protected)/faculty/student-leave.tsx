// Leave (student, class-advisor side) -- pixel-matches the design's filter
// chips + request cards. Real backend data only: the list is already scoped
// to this advisor's own sections; approve/reject go through the generic
// approvals engine (approving auto-marks the student ON_LEAVE on the exact
// requested dates -- see FacultyApprovalHandlers on the backend).

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { AttachIcon, DateRangeIcon } from '@/components/faculty/icons';
import { listStudentLeaveRequests, type StudentLeaveRequest } from '@/lib/faculty-student-leave-api';
import { approveRequest, rejectRequest } from '@/lib/faculty-approvals-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

type Filter = 'PENDING' | 'APPROVED' | 'REJECTED';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.round(ms / 86400000) + 1;
}

export default function StudentLeaveScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [busyId, setBusyId] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ['faculty-student-leave'], queryFn: listStudentLeaveRequests });
  const filtered = useMemo(() => (listQuery.data ?? []).filter((r) => r.state === filter), [listQuery.data, filter]);

  async function decide(request: StudentLeaveRequest, decision: 'APPROVED' | 'REJECTED') {
    if (!request.approvalRequestId) return;
    setBusyId(request.id);
    try {
      if (decision === 'APPROVED') await approveRequest(request.approvalRequestId);
      else await rejectRequest(request.approvalRequestId);
      queryClient.invalidateQueries({ queryKey: ['faculty-student-leave'] });
    } catch (err) {
      Alert.alert('Could not update request', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Leave" subtitle="Student leave requests" onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        <View style={styles.chipRow}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable key={f.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(f.key)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>LEAVE REQUESTS</Text>

        {listQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No {filter.toLowerCase()} requests</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filtered.map((l) => (
              <View key={l.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{l.studentName}</Text>
                    <Text style={styles.roll}>Roll {l.rollNo ?? '—'}{l.sectionName ? ` · ${l.gradeName} ${l.sectionName}` : ''}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      l.state === 'APPROVED' && { backgroundColor: facultyColors.greenBg },
                      l.state === 'REJECTED' && { backgroundColor: facultyColors.redBg },
                      l.state === 'PENDING' && { backgroundColor: facultyColors.amberBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        l.state === 'APPROVED' && { color: facultyColors.greenDark },
                        l.state === 'REJECTED' && { color: facultyColors.redDark },
                        l.state === 'PENDING' && { color: facultyColors.amberDark },
                      ]}
                    >
                      {l.state}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reason}>{l.reason}</Text>
                <View style={styles.dateRow}>
                  <DateRangeIcon />
                  <Text style={styles.dateText}>
                    {formatDate(l.fromDate)} – {formatDate(l.toDate)} · {daysBetween(l.fromDate, l.toDate)} day
                    {daysBetween(l.fromDate, l.toDate) === 1 ? '' : 's'}
                  </Text>
                </View>
                {l.attachmentFileName ? (
                  <View style={styles.dateRow}>
                    <AttachIcon />
                    <Text style={[styles.dateText, { color: facultyColors.blue, fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {l.attachmentFileName}
                    </Text>
                  </View>
                ) : null}
                {l.state === 'PENDING' ? (
                  <View style={styles.decideRow}>
                    <Pressable
                      style={[styles.decideBtn, styles.approveBtn]}
                      disabled={busyId === l.id}
                      onPress={() => decide(l, 'APPROVED')}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.decideBtn, styles.rejectBtn]}
                      disabled={busyId === l.id}
                      onPress={() => decide(l, 'REJECTED')}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32 },
  chipRow: { flexDirection: 'row', gap: 6, backgroundColor: facultyColors.chipTrack, borderRadius: 12, padding: 4 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  chipActive: { backgroundColor: facultyColors.blue },
  chipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  chipTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 20, marginBottom: 12, marginLeft: 4 },
  emptyBox: { backgroundColor: facultyColors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: facultyColors.borderLight, borderRadius: 16, paddingVertical: 34, alignItems: 'center' },
  emptyText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  roll: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted, marginTop: 3 },
  statusBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  statusText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  reason: { fontSize: 13.5, color: facultyColors.body, lineHeight: 20, marginTop: 10, fontFamily: 'PlusJakartaSans_500Medium' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  dateText: { fontSize: 12.5, color: facultyColors.mutedStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  decideRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  decideBtn: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11 },
  approveBtn: { backgroundColor: facultyColors.blue },
  approveBtnText: { color: '#fff', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  rejectBtn: { borderWidth: 1, borderColor: facultyColors.borderLight },
  rejectBtnText: { color: facultyColors.bodyMuted, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
});
