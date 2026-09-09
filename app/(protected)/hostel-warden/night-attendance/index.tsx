// Night Attendance -- hostel roll call only, NEVER academic/class attendance (a
// completely separate backend table -- see hostel-warden-api.ts). Roster rows
// don't carry class/section (the backend's own roster query doesn't return it --
// verified by reading HostelAttendanceRepository.findRoster rather than guessing),
// so this screen shows admission no + room/bed instead, which the backend does
// return. No camera capture here (unlike Study Attendance) -- roll call is always
// Warden-confirmed, matching the module's own plan.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { countRoster, RosterStatTiles } from '@/components/RosterStatTiles';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
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

const ALL_BLOCKS = 'All blocks';
const ALL_FLOORS = 'All floors';

// Present/Absent shown to the Warden for every student, even one nobody has tapped
// yet -- the recorded `status` (possibly null = never marked) always wins once it
// exists; otherwise an APPROVED leave for today defaults the display to Absent, and
// everyone else defaults to Present. This never writes to hostel_attendance itself --
// it's a display-only default, so `row.status === null` still means "not yet marked"
// for the "Mark all present" bulk action below.
function effectiveStatus(row: NightAttendanceRosterRow): 'PRESENT' | 'ABSENT' {
  return row.status ?? (row.hasApprovedLeaveToday ? 'ABSENT' : 'PRESENT');
}

export default function NightAttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [blockFilter, setBlockFilter] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<string | null>(null);

  const rosterQuery = useQuery({
    queryKey: QUERY_KEY(date),
    queryFn: () => getNightAttendanceRoster(date),
  });
  const roster = useMemo(() => rosterQuery.data ?? [], [rosterQuery.data]);

  const blockOptions = useMemo(() => {
    const names = Array.from(new Set(roster.map((r) => r.blockName).filter((n): n is string => !!n))).sort();
    return [ALL_BLOCKS, ...names];
  }, [roster]);

  const floorOptions = useMemo(() => {
    const inBlock = blockFilter && blockFilter !== ALL_BLOCKS ? roster.filter((r) => r.blockName === blockFilter) : roster;
    const floors = Array.from(new Set(inBlock.map((r) => r.floorNo).filter((f): f is number => f !== null))).sort((a, b) => a - b);
    return [ALL_FLOORS, ...floors.map((f) => `Floor ${f}`)];
  }, [roster, blockFilter]);

  const filteredRoster = useMemo(() => {
    return roster.filter((r) => {
      if (blockFilter && blockFilter !== ALL_BLOCKS && r.blockName !== blockFilter) return false;
      if (floorFilter && floorFilter !== ALL_FLOORS && `Floor ${r.floorNo}` !== floorFilter) return false;
      return true;
    });
  }, [roster, blockFilter, floorFilter]);

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
    // Only sweeps students who are genuinely unmarked AND not on an approved leave --
    // a student already defaulting to Absent for today's leave should never be
    // force-marked Present by a bulk action.
    const unmarked = filteredRoster
      .filter((r) => r.status === null && !r.hasApprovedLeaveToday)
      .map((r) => ({ studentId: r.studentId, status: 'PRESENT' as const }));
    if (unmarked.length > 0) markMutation.mutate(unmarked);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Night Attendance" onBack={() => router.back()} />

      <DateSelectorPill date={date} onChange={setDate} />

      {roster.length > 0 ? (
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Block"
              value={blockFilter ?? ALL_BLOCKS}
              placeholder={ALL_BLOCKS}
              options={blockOptions}
              onSelect={(v) => {
                setBlockFilter(v === ALL_BLOCKS ? null : v);
                setFloorFilter(null);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Floor"
              value={floorFilter ?? ALL_FLOORS}
              placeholder={ALL_FLOORS}
              options={floorOptions}
              onSelect={(v) => setFloorFilter(v === ALL_FLOORS ? null : v)}
            />
          </View>
        </View>
      ) : null}

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
        ) : filteredRoster.length === 0 ? (
          <EmptyState message="No students match the selected block/floor." />
        ) : (
          <>
            <RosterStatTiles
              counts={countRoster(filteredRoster.map((r) => ({ status: effectiveStatus(r) })))}
              onMarkAllPresent={markAllPresent}
              onClear={() => rosterQuery.refetch()}
              busy={markMutation.isPending && pendingStudentId === null}
            />
            {filteredRoster.map((row) => {
              const effective = effectiveStatus(row);
              const isDefaulted = row.status === null;
              const meta = attendanceStatusMeta(effective);
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
                    <StatusBadge label={isDefaulted ? `${meta.label} · default` : meta.label} tone={meta.tone} />
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionButton, effective === 'PRESENT' && styles.presentSelected]}
                      onPress={() => mark(row.studentId, 'PRESENT')}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <ActivityIndicator color={parentColors.blue} size="small" />
                      ) : (
                        <Text style={[styles.actionText, effective === 'PRESENT' && styles.actionTextSelected]}>Present</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, effective === 'ABSENT' && styles.absentSelected]}
                      onPress={() => mark(row.studentId, 'ABSENT')}
                      disabled={isPending}
                    >
                      <Text style={[styles.actionText, effective === 'ABSENT' && styles.absentTextSelected]}>Absent</Text>
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
  filterRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2 },
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
