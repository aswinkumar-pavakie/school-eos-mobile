// Vice Principal -> Attendance (Phase 7) -- school-level oversight, real
// backend data only (attendance-sessions.controller.ts's own
// /attendance-sessions, now also authorized for VICE_PRINCIPAL -- see that
// controller's comment). Guarded by the parent vice-principal/_layout.tsx.
//
// "Today's overview" aggregates real per-session counts (a bounded fetch --
// at most one call per real attendance_session that exists for the picked
// date, capped by this school's own section count, currently 56) -- no new
// backend aggregation endpoint, reusing the same two existing endpoints the
// session list/detail screens already use. Grade/Section filters reuse the
// exact same /grades /sections calls already authorized for VP in Phase 4.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import {
  getSession,
  listSessions,
  type AttendanceStatus,
} from '@/lib/vice-principal-attendance-api';
import { listGrades, listSections } from '@/lib/vice-principal-students-api';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

async function computeOverview(date: string) {
  const { data: sessions } = await listSessions({ dateFrom: date, dateTo: date, limit: 200 });
  const details = await Promise.all(sessions.map((s) => getSession(s.id)));
  const counts: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, ON_LEAVE: 0, HALF_DAY: 0 };
  let totalMarked = 0;
  for (const detail of details) {
    for (const status of Object.keys(counts) as AttendanceStatus[]) {
      counts[status] += detail.counts[status] ?? 0;
    }
    totalMarked += detail.records.length;
  }
  return {
    sessionsCount: sessions.length,
    totalMarked,
    counts,
    percentage: totalMarked > 0 ? Math.round((counts.PRESENT / totalMarked) * 100) : null,
  };
}

export default function VicePrincipalAttendanceScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);

  const overviewQuery = useQuery({ queryKey: ['vp-attendance', 'overview', date], queryFn: () => computeOverview(date) });

  const gradesQuery = useQuery({ queryKey: ['vp-attendance', 'grades'], queryFn: listGrades });
  const grade = useMemo(() => gradesQuery.data?.find((g) => g.name === gradeName) ?? null, [gradesQuery.data, gradeName]);
  const sectionsQuery = useQuery({
    queryKey: ['vp-attendance', 'sections', grade?.id],
    queryFn: () => listSections(grade?.id),
    enabled: !!grade,
  });
  const section = useMemo(
    () => sectionsQuery.data?.find((s) => s.name === sectionName) ?? null,
    [sectionsQuery.data, sectionName],
  );

  const sessionsQuery = useQuery({
    queryKey: ['vp-attendance', 'sessions', date, section?.id],
    queryFn: () => listSessions({ dateFrom: date, dateTo: date, sectionId: section?.id, limit: 100 }),
  });

  const overview = overviewQuery.data;
  const sessions = sessionsQuery.data?.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Attendance" subtitle="School-wide attendance overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <DateSelectorPill date={date} onChange={setDate} containerStyle={{ paddingHorizontal: 0, paddingTop: 0, marginBottom: 16 }} />

        <Text style={styles.sectionTitle}>Today&apos;s overview</Text>
        {overviewQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 16 }} />
        ) : overviewQuery.isError ? (
          <ErrorState
            message={overviewQuery.error instanceof ApiError ? overviewQuery.error.message : 'Unable to load the overview.'}
            onRetry={() => overviewQuery.refetch()}
          />
        ) : !overview || overview.sessionsCount === 0 ? (
          <EmptyState message="No attendance was recorded for this date." />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.percentage ?? '—'}%</Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.totalMarked}</Text>
                <Text style={styles.statLabel}>Marked today</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.sessionsCount}</Text>
                <Text style={styles.statLabel}>Sections recorded</Text>
              </View>
            </View>
            <View style={[styles.card, cardShadow, styles.breakdownRow]}>
              <BreakdownItem label="Present" value={overview.counts.PRESENT} tone="positive" />
              <BreakdownItem label="Absent" value={overview.counts.ABSENT} tone="negative" />
              <BreakdownItem label="Late" value={overview.counts.LATE} tone="warning" />
              <BreakdownItem label="On leave" value={overview.counts.ON_LEAVE} tone="neutral" />
              <BreakdownItem label="Half day" value={overview.counts.HALF_DAY} tone="neutral" />
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Sessions</Text>
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
              placeholder={!grade ? 'Pick a grade first' : sectionsQuery.isLoading ? 'Loading…' : 'Any section'}
              options={(sectionsQuery.data ?? []).map((s) => s.name)}
              onSelect={setSectionName}
              disabled={!grade || sectionsQuery.isLoading}
            />
          </View>
        </View>

        {sessionsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : sessionsQuery.isError ? (
          <ErrorState
            message={sessionsQuery.error instanceof ApiError ? sessionsQuery.error.message : 'Unable to load sessions.'}
            onRetry={() => sessionsQuery.refetch()}
          />
        ) : sessions.length === 0 ? (
          <EmptyState message="No attendance sessions match this date and filter." />
        ) : (
          <View style={styles.list}>
            {sessions.map((session, index) => (
              <Pressable
                key={session.id}
                style={[styles.row, index === 0 && styles.rowFirst]}
                onPress={() => router.push(`/(protected)/vice-principal/attendance/${session.id}` as never)}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle}>{session.sessionType} session</Text>
                  <Text style={styles.rowMeta}>{session.sessionDate}</Text>
                </View>
                <StatusBadge label={session.isLocked ? 'Locked' : 'Open'} tone={session.isLocked ? 'neutral' : 'warning'} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function BreakdownItem({ label, value, tone }: { label: string; value: number; tone: StatusTone }) {
  return (
    <View style={styles.breakdownItem}>
      <StatusBadge label={String(value)} tone={tone} />
      <Text style={styles.breakdownLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 10, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  breakdownItem: { alignItems: 'center', gap: 6, width: '19%' },
  breakdownLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
