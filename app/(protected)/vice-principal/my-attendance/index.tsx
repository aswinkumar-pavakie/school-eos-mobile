// Vice Principal -> My Attendance (Phase 27) -- the authenticated VP's own
// attendance, real backend data only (GET /staff/me/attendance-history,
// self-scoped server-side -- see vice-principal-my-attendance-api.ts's own
// comment). Distinct from the school-wide Attendance module (student/
// faculty oversight) -- this screen shows only the signed-in VP's own
// record and nothing else. Read-only: no punch action, no correction
// request (neither is a real VP-authorized capability in this backend).

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getMyAttendanceHistory } from '@/lib/vice-principal-my-attendance-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function statusMeta(status: string): { label: string; tone: StatusTone } {
  if (status === 'CHECK_IN') return { label: 'Present', tone: 'positive' };
  if (status === 'ABSENT') return { label: 'Absent', tone: 'negative' };
  return { label: status, tone: 'neutral' };
}

export default function VicePrincipalMyAttendanceScreen() {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;

  const query = useQuery({
    queryKey: ['vp-my-attendance', monthParam],
    queryFn: () => getMyAttendanceHistory(monthParam),
  });

  const monthly = query.data?.monthlySummary;
  const allTime = query.data?.allTimeSummary;
  const days = query.data?.days ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="My Attendance" subtitle="Your own attendance record" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : 'Unable to load your attendance.'}
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            <View style={styles.monthNav}>
              <Pressable
                style={styles.monthArrow}
                onPress={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
              >
                <Ionicons name="chevron-back" size={18} color={parentColors.ink} />
              </Pressable>
              <Text style={styles.monthNavLabel}>
                {MONTH_NAMES[cursor.month]} {cursor.year}
              </Text>
              <Pressable
                style={styles.monthArrow}
                onPress={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
              >
                <Ionicons name="chevron-forward" size={18} color={parentColors.ink} />
              </Pressable>
            </View>

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
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: parentColors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavLabel: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 4, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  allTimeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 14 },
  allTimeLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, letterSpacing: 0.4 },
  allTimeValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 4 },
  allTimeDetail: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
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
