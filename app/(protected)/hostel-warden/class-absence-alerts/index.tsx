// READ ONLY -- no mark-present/mark-absent/edit control anywhere here. The backend
// derives and generates these alerts itself (attendance module cross-referenced
// with hostel presence); this screen only displays what it returns, never
// duplicates that derivation or writes to academic attendance.
//
// Design follows the provided reference (date pill, info banner, avatar cards with
// a red "Class Absent" badge + green "Present in Hostel" line) -- but this
// backend's academic attendance is DAILY roll-call only (no periods/subjects/
// times tracked yet, confirmed by reading the attendance module's own schema), so
// unlike the reference this shows no subject name or specific class-period time --
// only real fields: student, class/section, the roll-call date, and the student's
// real room/bed from the hostel allocation list (cross-referenced client-side by
// studentId, not a second alert-detail endpoint).

import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { listClassAbsenceAlerts, listRoomAllocations, type HostelAllocationRow } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ClassAbsenceAlertsScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());

  const alertsQuery = useQuery({
    queryKey: ['hostel-warden', 'class-absence-alerts', date],
    queryFn: () => listClassAbsenceAlerts(date),
  });
  // Reused, not a second endpoint -- Room & Bed's own list already carries every
  // student's class/section/room/bed/photo, joined here by studentId.
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });

  const allocationByStudentId = useMemo(() => {
    const map = new Map<string, HostelAllocationRow>();
    for (const row of allocationsQuery.data ?? []) map.set(row.studentId, row);
    return map;
  }, [allocationsQuery.data]);

  const alerts = alertsQuery.data ?? [];
  const isLoading = alertsQuery.isLoading || allocationsQuery.isLoading;

  return (
    <View style={styles.flex}>
      <AppHeader title="Class Absence Alerts" onBack={() => router.back()} />

      <View style={styles.headerRow}>
        <DateSelectorPill date={date} onChange={setDate} containerStyle={styles.pillContainer} />
        <View style={styles.countBadge}>
          <View style={styles.countDot} />
          <Text style={styles.countBadgeText}>{alerts.length} Alert{alerts.length === 1 ? '' : 's'}</Text>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={parentColors.blueDeep} />
        <Text style={styles.infoBannerText}>
          These alerts are based on academic class attendance. The hostel records confirm the student was present in the
          hostel on this date.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={alertsQuery.isFetching} onRefresh={() => alertsQuery.refetch()} />}
      >
        {isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : alertsQuery.isError ? (
          <ErrorState
            message={alertsQuery.error instanceof ApiError ? alertsQuery.error.message : 'Unable to load alerts.'}
            onRetry={() => alertsQuery.refetch()}
          />
        ) : alerts.length === 0 ? (
          <EmptyState message="No class absence alerts for this date." />
        ) : (
          <>
            {alerts.map((alert) => {
              const allocation = allocationByStudentId.get(alert.studentId);
              return (
                <View key={alert.id} style={[styles.card, cardShadow]}>
                  <View style={styles.cardTop}>
                    <Avatar
                      firstName={alert.studentFirstName}
                      lastName={alert.studentLastName}
                      photoUrl={allocation?.photoUrl}
                      size={44}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {fullName(alert.studentFirstName, alert.studentLastName)}
                      </Text>
                      {allocation?.gradeName ? (
                        <Text style={styles.classLine} numberOfLines={1}>
                          {allocation.gradeName}
                          {allocation.sectionName ? ` - ${allocation.sectionName}` : ''}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.absentBadge}>
                      <Ionicons name="alert-circle" size={13} color="#B33A2E" />
                      <Text style={styles.absentBadgeText}>Class Absent</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color={parentColors.muted} />
                    <Text style={styles.metaText}>{formatDate(date)}</Text>
                  </View>

                  <View style={styles.presentRow}>
                    <Ionicons name="home" size={14} color="#1E8A4C" />
                    <Text style={styles.presentText}>Present in Hostel</Text>
                    {allocation ? (
                      <Text style={styles.presentDetail}>
                        (Room {allocation.roomNo} - Bed {allocation.bedNo})
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
            <Text style={styles.footer}>
              Showing {alerts.length} of {alerts.length} alert{alerts.length === 1 ? '' : 's'}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  pillContainer: { flexShrink: 1 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDECEA',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  countDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#B33A2E' },
  countBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#B33A2E' },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EAF1FF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
  },
  infoBannerText: { flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.blueDeep, lineHeight: 17 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  classLine: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  absentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDECEA',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  absentBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#B33A2E' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  presentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  presentText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#1E8A4C' },
  presentDetail: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  footer: { textAlign: 'center', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, marginTop: 4 },
});
