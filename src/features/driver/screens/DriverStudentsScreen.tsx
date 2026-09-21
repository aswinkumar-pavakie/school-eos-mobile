// Driver -- My Students / manual attendance fallback (Phase 2). Modeled on
// hostel-warden/night-attendance's own roster-card pattern (same
// Avatar/StatusBadge/EmptyState/ErrorState components, same pending-row
// mutation UX) rather than inventing new UI. A PICKUP/DROP direction toggle
// switches the roster and the trip being controlled -- both real, backend-
// modeled concepts (trip.direction, bus_boarding_event.direction), not a
// frontend-only distinction. Start/Complete Trip are explicit, optional
// controls: marking a student boarded auto-starts the trip anyway if the
// driver skips straight to marking, matching the backend's own fallback
// design (see driver-app.service.ts). The roster is always scoped
// server-side to the driver's own route already (findMyStudents joins on
// rs.route_id = the driver's own current assignment) -- the stop filter
// chips below are a client-side narrowing of THAT same real list by
// row.stopName, for when a driver wants to see just the stop they're
// currently at rather than the whole route at once.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@/components/GradientHeader';
import { Avatar } from '@/components/Avatar';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import {
  completeTrip,
  DIRECTION_HELP,
  DRIVER_DASHBOARD_KEY,
  getDashboard,
  getMyStudents,
  markStudents,
  startTrip,
  todayLabel,
  tripAction,
  tripStatusText,
  tripTone,
  undoMarkPresent,
  type MyStudentRow,
  type TripDirection,
} from '@/lib/driver-api';
import { parentColors, cardShadow } from '@/lib/theme';

const QUERY_KEY = (direction: TripDirection) => ['driver', 'my-students', direction];

export function DriverStudentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<TripDirection>('PICKUP');
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [stopFilter, setStopFilter] = useState<string | null>(null);
  // Session-local only -- "Absent" has no real backend concept (a student
  // who is never marked present is already "not boarded" in the real data,
  // same as today). This just lets the driver visually check a student off
  // the list as "not on the bus" while going through the roster, without
  // writing anything. Resets on direction switch since PICKUP/DROP are
  // separate rosters.
  const [absentStudentIds, setAbsentStudentIds] = useState<Set<string>>(new Set());

  // Reached either via router.push (Home's menu tile/dashboard card -- has a
  // real back-stack entry) or router.replace (the bottom tab bar -- no
  // back-stack entry at all, so a plain router.back() silently does
  // nothing). canGoBack() picks the right one either way.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }

  // NFC (card-tap) boarding is the primary attendance path -- this screen is
  // only the manual fallback for when NFC/the device isn't working. A real
  // card tap writes a bus_boarding_event exactly like this screen's own
  // "Mark present" does (see driver-app.service.ts's markStudents doc
  // comment), so a student can go from unmarked to markedToday=true at any
  // moment while a driver has this screen open, independent of anything the
  // driver taps. Polling every 10s (rather than only on manual pull-to-
  // refresh) is what makes the Present button/badge flip on its own the
  // instant a real card tap lands -- not just when the driver happens to
  // refresh.
  const studentsQuery = useQuery({
    queryKey: QUERY_KEY(direction),
    queryFn: () => getMyStudents(direction),
    refetchInterval: 10_000,
  });
  // Same GET /driver/dashboard the Home screen reads -- shared cache entry
  // (DRIVER_DASHBOARD_KEY), so the trip status shown here is always
  // consistent with Home's, whichever screen the driver acted on last.
  // Polled for the same reason as studentsQuery above -- NFC taps also move
  // the attendance-progress numbers and trip state shown there.
  const dashboardQuery = useQuery({ queryKey: DRIVER_DASHBOARD_KEY, queryFn: getDashboard, refetchInterval: 10_000 });
  const trip = dashboardQuery.data?.trips[direction];
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);

  // Real stops on this driver's own route, in the same physical stop order
  // the backend already returns (rs.sequence_no) -- deduped, not re-sorted.
  const stops = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of students) {
      if (!seen.has(s.stopName)) {
        seen.add(s.stopName);
        list.push(s.stopName);
      }
    }
    return list;
  }, [students]);

  const visibleStudents = stopFilter ? students.filter((s) => s.stopName === stopFilter) : students;
  const markedCount = visibleStudents.filter((s) => s.markedToday).length;

  const markMutation = useMutation({
    mutationFn: (studentIds: string[]) => markStudents(direction, studentIds),
    onMutate: async (studentIds) => {
      if (studentIds.length === 1) setPendingStudentId(studentIds[0]!);
      const key = QUERY_KEY(direction);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyStudentRow[]>(key);
      const idSet = new Set(studentIds);
      queryClient.setQueryData<MyStudentRow[]>(key, (rows) =>
        (rows ?? []).map((row) => (idSet.has(row.studentId) ? { ...row, markedToday: true } : row)),
      );
      return { previous };
    },
    onError: (err, _studentIds, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY(direction), context.previous);
      Alert.alert('Could not update', err instanceof ApiError ? err.message : 'Please try again.');
    },
    onSettled: () => {
      setPendingStudentId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(direction) });
    },
  });

  const tripMutation = useMutation({
    mutationFn: (action: 'start' | 'complete') => (action === 'start' ? startTrip(direction) : completeTrip(direction)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DRIVER_DASHBOARD_KEY }),
    onError: (err) => {
      Alert.alert('Could not update trip', err instanceof ApiError ? err.message : 'Please try again.');
    },
  });

  // Undoing a real Present writes a real correction row server-side (the
  // original event is append-only, never deleted) -- unlike the local-only
  // Absent toggle above, this is a genuine, audited backend action, so it
  // gets a confirmation prompt rather than reverting on a single tap.
  const undoMutation = useMutation({
    mutationFn: (studentId: string) => undoMarkPresent(direction, studentId),
    onMutate: async (studentId) => {
      setPendingStudentId(studentId);
      const key = QUERY_KEY(direction);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyStudentRow[]>(key);
      queryClient.setQueryData<MyStudentRow[]>(key, (rows) =>
        (rows ?? []).map((row) => (row.studentId === studentId ? { ...row, markedToday: false } : row)),
      );
      return { previous };
    },
    onError: (err, studentId, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY(direction), context.previous);
      Alert.alert('Could not undo', err instanceof ApiError ? err.message : 'Please try again.');
    },
    onSettled: () => {
      setPendingStudentId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(direction) });
      queryClient.invalidateQueries({ queryKey: DRIVER_DASHBOARD_KEY });
    },
  });

  function markOne(studentId: string) {
    markMutation.mutate([studentId]);
  }

  function confirmUndo(studentId: string, studentName: string) {
    Alert.alert(
      'Undo Present?',
      `${studentName} will be marked unmarked again. This is recorded as a correction, not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo', style: 'destructive', onPress: () => undoMutation.mutate(studentId) },
      ],
    );
  }

  function markAllRemaining() {
    const unmarked = visibleStudents.filter((s) => !s.markedToday).map((s) => s.studentId);
    if (unmarked.length > 0) markMutation.mutate(unmarked);
  }

  function selectDirection(d: TripDirection) {
    setDirection(d);
    setStopFilter(null);
    setAbsentStudentIds(new Set());
  }

  function markAbsent(studentId: string) {
    setAbsentStudentIds((prev) => new Set(prev).add(studentId));
  }

  function undoAbsent(studentId: string) {
    setAbsentStudentIds((prev) => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  }

  // Both directions record a real BOARD-type presence confirmation (see
  // driver-app.repository.ts's MANUAL_MARK_EVENT_DIRECTION) -- never an
  // ALIGHT event -- so the copy stays neutral rather than implying a DROP
  // mark means "got off the bus".
  const actionLabel = 'Mark present';
  const markedLabel = 'Present';

  return (
    <View style={styles.flex}>
      <GradientHeader title="My Students" subtitle="Manual fallback — use only if NFC is unavailable" onBack={goBack} />

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={14} color={parentColors.blueDeep} />
        <Text style={styles.dateText}>{todayLabel()}</Text>
      </View>

      <View style={styles.directionRow}>
        {(['PICKUP', 'DROP'] as const).map((d) => (
          <Pressable
            key={d}
            style={[styles.directionTab, direction === d && styles.directionTabActive]}
            onPress={() => selectDirection(d)}
          >
            <Text style={[styles.directionTabText, direction === d && styles.directionTabTextActive]}>
              {d === 'PICKUP' ? 'Morning pickup' : 'Afternoon drop'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.tripCard, cardShadow]}>
        <View style={styles.tripCardTop}>
          <Text style={styles.tripHelper}>{DIRECTION_HELP[direction]}</Text>
          <StatusBadge label={tripStatusText(trip?.state)} tone={tripTone(trip?.state)} />
        </View>

        {tripMutation.isPending ? (
          <View style={styles.tripActionBtn}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        ) : tripAction(trip?.state) === 'complete' ? (
          <Pressable style={[styles.tripActionBtn, styles.tripActionComplete]} onPress={() => tripMutation.mutate('complete')}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.tripActionText}>Complete trip</Text>
          </Pressable>
        ) : tripAction(trip?.state) === 'start' ? (
          <Pressable style={[styles.tripActionBtn, styles.tripActionStart]} onPress={() => tripMutation.mutate('start')}>
            <Ionicons name="play-circle-outline" size={18} color="#fff" />
            <Text style={styles.tripActionText}>Start trip</Text>
          </Pressable>
        ) : (
          <View style={styles.tripDoneRow}>
            <Ionicons
              name={trip?.state === 'COMPLETED' ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={trip?.state === 'COMPLETED' ? '#1E8A4C' : '#B33A2E'}
            />
            <Text style={styles.tripDoneText}>
              {trip?.state === 'COMPLETED' ? 'Nothing more to do for this trip.' : 'This trip cannot be started again.'}
            </Text>
          </View>
        )}
      </View>

      {stops.length > 1 ? (
        <View style={styles.stopRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stopRow}>
            <Pressable style={[styles.stopChip, stopFilter === null && styles.stopChipActive]} onPress={() => setStopFilter(null)}>
              <Text style={[styles.stopChipText, stopFilter === null && styles.stopChipTextActive]}>All stops</Text>
            </Pressable>
            {stops.map((stop) => (
              <Pressable
                key={stop}
                style={[styles.stopChip, stopFilter === stop && styles.stopChipActive]}
                onPress={() => setStopFilter(stop)}
              >
                <Text style={[styles.stopChipText, stopFilter === stop && styles.stopChipTextActive]}>{stop}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={studentsQuery.isFetching} onRefresh={() => studentsQuery.refetch()} />}
      >
        {studentsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : studentsQuery.isError ? (
          <ErrorState
            message={studentsQuery.error instanceof ApiError ? studentsQuery.error.message : 'Unable to load your students.'}
            onRetry={() => studentsQuery.refetch()}
          />
        ) : students.length === 0 ? (
          <EmptyState message="No students allocated to your route for this direction, or no current bus assignment." />
        ) : visibleStudents.length === 0 ? (
          <EmptyState message="No students at this stop." />
        ) : (
          <>
            <View style={[styles.summaryCard, cardShadow]}>
              <Text style={styles.summaryText}>
                {markedCount} / {visibleStudents.length} {markedLabel.toLowerCase()}
                {stopFilter ? ` at ${stopFilter}` : ''}
              </Text>
              <Pressable
                style={styles.markAllButton}
                onPress={markAllRemaining}
                disabled={markMutation.isPending || markedCount === visibleStudents.length}
              >
                {markMutation.isPending && pendingStudentId === null ? (
                  <ActivityIndicator color={parentColors.blue} size="small" />
                ) : (
                  <Text style={styles.markAllText}>Mark all {markedLabel.toLowerCase()}</Text>
                )}
              </Pressable>
            </View>

            {visibleStudents.map((row) => {
              const isPending =
                (markMutation.isPending || undoMutation.isPending) && pendingStudentId === row.studentId;
              const canUndo = row.markedTodaySource === 'DRIVER_MANUAL';
              return (
                <View key={row.studentId} style={[styles.card, cardShadow]}>
                  <View style={styles.cardTop}>
                    <Avatar firstName={row.firstName} lastName={row.lastName} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {row.firstName} {row.lastName ?? ''}
                      </Text>
                      <Text style={styles.studentMeta} numberOfLines={1}>
                        {row.admissionNo}
                        {row.gradeName ? ` · ${row.gradeName}${row.sectionName ? ` ${row.sectionName}` : ''}` : ''}
                        {' · '}
                        {row.stopName}
                      </Text>
                    </View>
                    {row.markedToday && canUndo ? (
                      isPending ? (
                        <View style={styles.presentPendingChip}>
                          <ActivityIndicator color={parentColors.blue} size="small" />
                        </View>
                      ) : (
                        <Pressable
                          style={styles.presentMarkedChip}
                          onPress={() => confirmUndo(row.studentId, `${row.firstName} ${row.lastName ?? ''}`.trim())}
                          hitSlop={6}
                        >
                          <Text style={styles.presentMarkedText}>{markedLabel}</Text>
                          <Ionicons name="sync-outline" size={13} color="#1E8A4C" />
                        </Pressable>
                      )
                    ) : row.markedToday ? (
                      <StatusBadge label={markedLabel} tone="positive" />
                    ) : absentStudentIds.has(row.studentId) ? (
                      <Pressable style={styles.absentMarkedChip} onPress={() => undoAbsent(row.studentId)} hitSlop={6}>
                        <Text style={styles.absentMarkedText}>Absent</Text>
                        <Ionicons name="sync-outline" size={13} color="#B33A2E" />
                      </Pressable>
                    ) : (
                      <View style={styles.rowActions}>
                        <Pressable style={styles.absentButton} onPress={() => markAbsent(row.studentId)} disabled={isPending}>
                          <Text style={styles.absentButtonText}>Absent</Text>
                        </Pressable>
                        <Pressable style={styles.markButton} onPress={() => markOne(row.studentId)} disabled={isPending}>
                          {isPending ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.markButtonText}>{actionLabel}</Text>
                          )}
                        </Pressable>
                      </View>
                    )}
                  </View>
                  {absentStudentIds.has(row.studentId) ? (
                    <Text style={styles.absentHint}>Tap Absent above to mark present instead</Text>
                  ) : row.markedToday && canUndo ? (
                    <Text style={styles.absentHint}>Tap Present above to undo if marked by mistake</Text>
                  ) : null}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: parentColors.pillBlueBg,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: parentColors.blueDeep },
  directionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  directionTab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: parentColors.border,
  },
  directionTabActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  directionTabText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: parentColors.ink },
  directionTabTextActive: { color: '#fff' },
  // Wrapper gives the horizontal ScrollView a real, explicit height -- a
  // ScrollView with only text-sized children and no height of its own can
  // end up collapsed to 0 in some RN layout passes, which reads as "the
  // pills are there but the text is invisible" (the pill background is a
  // sibling of the ScrollView, not affected the same way).
  stopRowWrap: { height: 44, marginTop: 10 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  stopChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: parentColors.border,
  },
  stopChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  stopChipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: parentColors.ink,
    textAlign: 'center',
    includeFontPadding: false,
  },
  stopChipTextActive: { color: '#fff' },
  tripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 10, gap: 12 },
  tripCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  tripHelper: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: parentColors.muted, lineHeight: 17 },
  tripActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 11,
  },
  tripActionStart: { backgroundColor: parentColors.blue },
  tripActionComplete: { backgroundColor: '#1E8A4C' },
  tripActionText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#fff' },
  tripDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripDoneText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: parentColors.muted },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  markAllButton: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: parentColors.pillNeutralBg },
  markAllText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: parentColors.blue },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  studentMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 6 },
  markButton: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: parentColors.blue },
  markButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5, color: '#fff' },
  absentButton: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: parentColors.border },
  absentButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5, color: parentColors.muted },
  // Distinct from the plain StatusBadge (a static read-only label) --
  // bordered + a sync icon so this reads as an interactive control the
  // driver can tap again, not a fixed status.
  absentMarkedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F3C6C0',
  },
  absentMarkedText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#B33A2E' },
  // Same "this is tappable, not a fixed status" treatment as
  // absentMarkedChip, green-toned to match StatusBadge's positive tone --
  // only rendered when markedTodaySource is this driver's own DRIVER_MANUAL
  // mark (NFC/attendant marks stay the plain, non-interactive StatusBadge).
  presentMarkedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#E6F6EC',
    borderWidth: 1,
    borderColor: '#BEE6CC',
  },
  presentMarkedText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#1E8A4C' },
  presentPendingChip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 16 },
  absentHint: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11.5, color: parentColors.muted, marginTop: 8 },
});
