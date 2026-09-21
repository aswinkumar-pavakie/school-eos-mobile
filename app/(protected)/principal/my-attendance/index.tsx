// Principal -> My Attendance -- the authenticated Principal's own attendance,
// real backend data only (GET /staff/me/attendance-history, self-scoped --
// see principal-my-attendance-api.ts's own comment, PRINCIPAL already
// authorized identical to VICE_PRINCIPAL). Distinct from the school-wide
// staff Attendance module (Principal's own write-capable roster/marking
// screen) -- this shows only the signed-in Principal's own record. Read-
// only: no punch action, no correction request (neither is a real
// Principal-authorized capability in this backend).

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { MonthGrid } from '@/components/principal/MonthGrid';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { principalColors } from '@/lib/theme';
import { getMyAttendanceHistory } from '@/lib/principal-my-attendance-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function statusMeta(status: string): { label: string; tone: StatusTone } {
  if (status === 'CHECK_IN') return { label: 'Present', tone: 'positive' };
  if (status === 'ABSENT') return { label: 'Absent', tone: 'negative' };
  return { label: status, tone: 'neutral' };
}

export default function PrincipalMyAttendanceScreen() {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;

  const query = useQuery({
    queryKey: ['principal-my-attendance', monthParam],
    queryFn: () => getMyAttendanceHistory(monthParam),
  });

  const monthly = query.data?.monthlySummary;
  const allTime = query.data?.allTimeSummary;
  const days = query.data?.days ?? [];

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="My Attendance" subtitle="Your own attendance record" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 24 }} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : 'Unable to load your attendance.'}
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            <Text style={styles.sectionTitle}>This month</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{monthly?.presentCount ?? 0}</Text>
                <Text style={styles.statLabel}>Present days</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{monthly ? monthly.totalCount - monthly.presentCount : 0}</Text>
                <Text style={styles.statLabel}>Absent days</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{monthly?.percentage != null ? `${monthly.percentage}%` : '—'}</Text>
                <Text style={styles.statLabel}>Rate</Text>
              </View>
            </View>

            <View style={[styles.allTimeCard, cardShadow]}>
              <Text style={styles.allTimeLabel}>All-time attendance</Text>
              <Text style={styles.allTimeValue}>
                {allTime?.percentage != null ? `${allTime.percentage}%` : '—'}
                <Text style={styles.allTimeDetail}> · {allTime?.presentCount ?? 0} of {allTime?.totalCount ?? 0} marked days</Text>
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Calendar</Text>
            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              onPrevMonth={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
              onNextMonth={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
              renderDay={(dateStr) => {
                const day = days.find((d) => d.date === dateStr);
                if (!day) return undefined;
                if (day.status === 'CHECK_IN') return { backgroundColor: principalColors.greenBg, textColor: principalColors.green };
                return { backgroundColor: principalColors.redBg, textColor: principalColors.red };
              }}
            />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: principalColors.greenBg }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: principalColors.redBg }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Daily record</Text>
            {days.length === 0 ? (
              <EmptyState message="No attendance events recorded for this month." />
            ) : (
              <View style={styles.list}>
                {days.map((day, index) => {
                  const meta = statusMeta(day.status);
                  return (
                    <View key={day.date} style={[styles.row, index === 0 && styles.rowFirst]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.rowTitle}>{formatDate(day.date)}</Text>
                        <Text style={styles.rowMeta}>
                          {day.status === 'CHECK_IN' ? formatDateTime(day.occurredAt) : (day.reason ?? 'No reason recorded')}
                        </Text>
                      </View>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 18, marginBottom: 10 },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, textAlign: 'center' },
  allTimeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 14 },
  allTimeLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.muted, letterSpacing: 0.4 },
  allTimeValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 4 },
  allTimeDetail: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: principalColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 2 },
});
