// Vice Principal -> Attendance session detail (Phase 7) -- view-only, real
// backend data only. No write actions -- attendance-sessions.controller.ts
// only grants VICE_PRINCIPAL the two read methods this module uses; create
// and lock stay ADMIN-only, enforced server-side. Section/grade name resolved
// by cross-referencing the same /grades /sections calls already authorized
// for VP in Phase 4 -- no new backend join added just for a label.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { getSession, type AttendanceStatus } from '@/lib/vice-principal-attendance-api';
import { listGrades, listSections } from '@/lib/vice-principal-students-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function statusMeta(status: AttendanceStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case 'PRESENT':
      return { label: 'Present', tone: 'positive' };
    case 'ABSENT':
      return { label: 'Absent', tone: 'negative' };
    case 'LATE':
      return { label: 'Late', tone: 'warning' };
    case 'HALF_DAY':
      return { label: 'Half day', tone: 'warning' };
    default:
      return { label: 'On leave', tone: 'neutral' };
  }
}

export default function VicePrincipalAttendanceSessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const sessionQuery = useQuery({ queryKey: ['vp-attendance', 'session', id], queryFn: () => getSession(id) });
  const sectionsQuery = useQuery({ queryKey: ['vp-attendance', 'all-sections'], queryFn: () => listSections() });
  const gradesQuery = useQuery({ queryKey: ['vp-attendance', 'all-grades'], queryFn: listGrades });

  if (sessionQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Attendance" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Attendance" onBack={() => router.back()} />
        <ErrorState
          message={sessionQuery.error instanceof ApiError ? sessionQuery.error.message : "Couldn't load this session."}
          onRetry={() => sessionQuery.refetch()}
        />
      </View>
    );
  }

  const session = sessionQuery.data;
  const section = sectionsQuery.data?.find((s) => s.id === session.sectionId);
  const grade = section ? gradesQuery.data?.find((g) => g.id === section.gradeId) : undefined;
  const label = section ? `${grade?.name ?? ''} ${section.name}`.trim() : 'Section';

  return (
    <View style={styles.flex}>
      <AppHeader title={label || 'Attendance session'} subtitle={session.sessionDate} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.summaryRow]}>
          {(Object.keys(session.counts) as AttendanceStatus[])
            .filter((s) => session.counts[s] > 0)
            .map((s) => {
              const meta = statusMeta(s);
              return (
                <View key={s} style={styles.summaryItem}>
                  <StatusBadge label={String(session.counts[s])} tone={meta.tone} />
                  <Text style={styles.summaryLabel}>{meta.label}</Text>
                </View>
              );
            })}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{session.records.length} students</Text>
          <StatusBadge label={session.isLocked ? 'Locked' : 'Open'} tone={session.isLocked ? 'neutral' : 'warning'} />
        </View>

        <Text style={styles.sectionTitle}>Students</Text>
        <View style={[styles.list, cardShadow]}>
          {session.records.map((record, index) => {
            const meta = statusMeta(record.status);
            return (
              <View key={record.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {record.firstName} {record.lastName ?? ''}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {record.rollNo != null ? `Roll no. ${record.rollNo}` : ''}
                    {record.reason ? `${record.rollNo != null ? ' · ' : ''}${record.reason}` : ''}
                  </Text>
                </View>
                <StatusBadge {...meta} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: 12 },
  summaryItem: { alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  metaText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
