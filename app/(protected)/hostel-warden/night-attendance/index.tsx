// Night Attendance -- hostel roll call only, NEVER academic/class attendance (a
// completely separate backend table -- see hostel-warden-api.ts). Roster rows
// don't carry class/section (the backend's own roster query doesn't return it --
// verified by reading HostelAttendanceRepository.findRoster rather than guessing),
// so this screen shows admission no + room/bed instead, which the backend does
// return. No camera capture here (unlike Study Attendance) -- roll call is always
// Warden-confirmed, matching the module's own plan.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { countRoster, RosterStatTiles } from '@/components/RosterStatTiles';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import {
  getNightAttendanceRoster,
  markNightAttendance,
  type NightAttendanceRosterRow,
  type NightAttendanceStatus,
} from '@/lib/hostel-warden-api';
import { attendanceStatusMeta, fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const QUERY_KEY = (date: string) => ['hostel-warden', 'night-attendance', date];

export default function NightAttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);

  const rosterQuery = useQuery({
    queryKey: QUERY_KEY(date),
    queryFn: () => getNightAttendanceRoster(date),
  });
  const roster = rosterQuery.data ?? [];

  const markMutation = useMutation({
    mutationFn: (entries: { studentId: string; status: NightAttendanceStatus }[]) =>
      markNightAttendance(date, entries),
    onMutate: async (entries) => {
      if (entries.length === 1) setPendingStudentId(entries[0]!.studentId);
      const key = QUERY_KEY(date);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NightAttendanceRosterRow[]>(key);
      const byId = new Map(entries.map((e) => [e.studentId, e.status]));
      queryClient.setQueryData<NightAttendanceRosterRow[]>(key, (rows) =>
        (rows ?? []).map((row) =>
          byId.has(row.studentId)
            ? { ...row, status: byId.get(row.studentId)!, recordedAt: new Date().toISOString() }
            : row,
        ),
      );
      return { previous };
    },
    onError: (err, _entries, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY(date), context.previous);
      Alert.alert('Could not update attendance', err instanceof ApiError ? err.message : 'Please try again.');
    },
    onSettled: () => {
      setPendingStudentId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(date) });
    },
  });

  function mark(studentId: string, status: NightAttendanceStatus) {
    markMutation.mutate([{ studentId, status }]);
  }

  function markAllPresent() {
    const unmarked = roster.filter((r) => r.status === null).map((r) => ({ studentId: r.studentId, status: 'PRESENT' as const }));
    if (unmarked.length > 0) markMutation.mutate(unmarked);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Night Attendance" onBack={() => router.back()} />

      <DateSelectorPill date={date} onChange={setDate} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={rosterQuery.isFetching} onRefresh={() => rosterQuery.refetch()} />}
      >
        {rosterQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : rosterQuery.isError ? (
          <ErrorState
            message={rosterQuery.error instanceof ApiError ? rosterQuery.error.message : 'Unable to load roster.'}
            onRetry={() => rosterQuery.refetch()}
          />
        ) : roster.length === 0 ? (
          <EmptyState message="No students currently allocated to your hostel." />
        ) : (
          <>
            <RosterStatTiles
              counts={countRoster(roster)}
              onMarkAllPresent={markAllPresent}
              onClear={() => rosterQuery.refetch()}
              busy={markMutation.isPending && pendingStudentId === null}
            />
            {roster.map((row) => {
              const meta = attendanceStatusMeta(row.status);
              const isPending = markMutation.isPending && pendingStudentId === row.studentId;
              return (
                <View key={row.studentId} style={[styles.card, cardShadow]}>
                  <View style={styles.cardTop}>
                    <Avatar firstName={row.firstName} lastName={row.lastName} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {fullName(row.firstName, row.lastName)}
                      </Text>
                      <Text style={styles.studentMeta} numberOfLines={1}>
                        {row.admissionNo}
                        {row.roomNo ? ` · Room ${row.roomNo}` : ''}
                        {row.bedNo ? ` · Bed ${row.bedNo}` : ''}
                      </Text>
                    </View>
                    <StatusBadge label={meta.label} tone={meta.tone} />
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionButton, row.status === 'PRESENT' && styles.presentSelected]}
                      onPress={() => mark(row.studentId, 'PRESENT')}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <ActivityIndicator color={parentColors.blue} size="small" />
                      ) : (
                        <Text style={[styles.actionText, row.status === 'PRESENT' && styles.actionTextSelected]}>Present</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, row.status === 'ABSENT' && styles.absentSelected]}
                      onPress={() => mark(row.studentId, 'ABSENT')}
                      disabled={isPending}
                    >
                      <Text style={[styles.actionText, row.status === 'ABSENT' && styles.absentTextSelected]}>Absent</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  studentMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: parentColors.border,
    backgroundColor: parentColors.background,
  },
  presentSelected: { backgroundColor: '#E6F6EC', borderColor: '#1E8A4C' },
  absentSelected: { backgroundColor: '#FDECEA', borderColor: '#B33A2E' },
  actionText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: parentColors.ink },
  actionTextSelected: { color: '#1E8A4C' },
  absentTextSelected: { color: '#B33A2E' },
});
