// Study session roster + present/absent marking. MVP is Warden-confirmed presence
// only -- the "Open Camera" card below is a visual placeholder matching the design
// reference, NOT a real camera integration (no expo-camera dependency exists in
// this app, and the backend deliberately has no photo column/face-recognition
// path yet -- see the backend's own README). Tapping it explains this rather than
// silently doing nothing or pretending to capture a photo.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { countRoster, RosterStatTiles } from '@/components/RosterStatTiles';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { getStudySessionRoster, markStudyAttendance, type NightAttendanceStatus } from '@/lib/hostel-warden-api';
import { attendanceStatusMeta, fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

export default function StudySessionRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);

  const queryKey = ['hostel-warden', 'study-attendance', id];
  const rosterQuery = useQuery({
    queryKey,
    queryFn: () => getStudySessionRoster(id!),
    enabled: !!id,
  });
  const roster = rosterQuery.data?.roster ?? [];

  const markMutation = useMutation({
    mutationFn: (entries: { studentId: string; status: NightAttendanceStatus }[]) => markStudyAttendance(id!, entries),
    onMutate: async (entries) => {
      if (entries.length === 1) setPendingStudentId(entries[0]!.studentId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof getStudySessionRoster>>>(queryKey);
      const byId = new Map(entries.map((e) => [e.studentId, e.status]));
      queryClient.setQueryData<Awaited<ReturnType<typeof getStudySessionRoster>>>(queryKey, (data) =>
        data
          ? {
              ...data,
              roster: data.roster.map((row) =>
                byId.has(row.studentId)
                  ? { ...row, status: byId.get(row.studentId)!, recordedAt: new Date().toISOString() }
                  : row,
              ),
            }
          : data,
      );
      return { previous };
    },
    onError: (err, _entries, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      Alert.alert('Could not update attendance', err instanceof ApiError ? err.message : 'Please try again.');
    },
    onSettled: () => {
      setPendingStudentId(null);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const session = rosterQuery.data?.session;

  function markAllPresent() {
    const unmarked = roster.filter((r) => r.status === null).map((r) => ({ studentId: r.studentId, status: 'PRESENT' as const }));
    if (unmarked.length > 0) markMutation.mutate(unmarked);
  }

  function openCamera() {
    Alert.alert(
      'Camera capture coming soon',
      'Photo-based attendance capture is not available in this version. Mark students present or absent below.',
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title={session ? formatDate(session.sessionDate) : 'Study session'}
        subtitle={session ? `${session.startTime.slice(0, 5)} – ${session.endTime.slice(0, 5)}` : undefined}
        onBack={() => router.back()}
      />
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
            {session?.isLocked ? (
              <View style={styles.lockedBanner}>
                <Text style={styles.lockedBannerText}>This session is locked and can no longer be edited.</Text>
              </View>
            ) : null}

            <View style={styles.cameraCard}>
              <View style={styles.cameraCardTop}>
                <Text style={styles.cameraTitle}>Photo capture</Text>
                <View style={styles.notMarkedPill}>
                  <Text style={styles.notMarkedText}>NOT AVAILABLE YET</Text>
                </View>
              </View>
              <Text style={styles.cameraSubtitle}>Mark students present or absent below</Text>
              <Pressable style={styles.cameraFrame} onPress={openCamera}>
                <Ionicons name="camera-outline" size={34} color="rgba(255,255,255,0.85)" />
                <Text style={styles.cameraFrameTitle}>Camera capture coming soon</Text>
                <Text style={styles.cameraFrameHint}>This version uses manual marking only</Text>
              </Pressable>
            </View>

            <RosterStatTiles
              counts={countRoster(roster)}
              onMarkAllPresent={markAllPresent}
              onClear={() => rosterQuery.refetch()}
              busy={markMutation.isPending && pendingStudentId === null}
            />

            {roster.map((row) => {
              const meta = attendanceStatusMeta(row.status);
              const isPending = markMutation.isPending && pendingStudentId === row.studentId;
              const disabled = isPending || !!session?.isLocked;
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
                      </Text>
                    </View>
                    <StatusBadge label={meta.label} tone={meta.tone} />
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionButton, row.status === 'PRESENT' && styles.presentSelected]}
                      onPress={() => markMutation.mutate([{ studentId: row.studentId, status: 'PRESENT' }])}
                      disabled={disabled}
                    >
                      {isPending ? (
                        <ActivityIndicator color={parentColors.blue} size="small" />
                      ) : (
                        <Text style={[styles.actionText, row.status === 'PRESENT' && styles.actionTextSelected]}>Present</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, row.status === 'ABSENT' && styles.absentSelected]}
                      onPress={() => markMutation.mutate([{ studentId: row.studentId, status: 'ABSENT' }])}
                      disabled={disabled}
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
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  lockedBanner: { backgroundColor: parentColors.pillNeutralBg, borderRadius: 12, padding: 12 },
  lockedBannerText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: parentColors.muted, textAlign: 'center' },
  cameraCard: { backgroundColor: parentColors.blueDeep, borderRadius: 20, padding: 18 },
  cameraCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cameraTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  notMarkedPill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  notMarkedText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#FBD38D', letterSpacing: 0.4 },
  cameraSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  cameraFrame: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 4,
  },
  cameraFrameTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff', marginTop: 6 },
  cameraFrameHint: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: 'rgba(255,255,255,0.7)' },
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
