// Employee Attendance -- Faculty's own view of their real attendance, no
// punch-in/out actions (explicit instruction: viewing only). Pixel-matches
// the design's Today card + rate ring + recent-days list, with one honest
// change: the design's "Late marks" legend row is dropped (no real
// configured shift-start time exists anywhere in this schema to judge
// lateness against -- see faculty-my-attendance.service.ts's own header
// note) in favor of a real "On Duty" row, all three legend rows now backed
// by genuine event data.

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { RingStat } from '@/components/faculty/RingStat';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/faculty/icons';
import { getMyAttendance } from '@/lib/faculty-my-attendance-api';
import { formatDate } from '@/lib/format';
import { facultyColors, cardShadow } from '@/lib/theme';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function statusBadge(status: string | null) {
  if (status === 'PRESENT') return { bg: facultyColors.greenBg, fg: facultyColors.greenDark, label: 'PRESENT' };
  if (status === 'ABSENT') return { bg: facultyColors.redBg, fg: facultyColors.redDark, label: 'ABSENT' };
  if (status === 'ON_DUTY') return { bg: facultyColors.blueLight, fg: facultyColors.blueDark, label: 'ON DUTY' };
  return { bg: facultyColors.borderSoft, fg: facultyColors.mutedStrong, label: 'NO DATA' };
}

export default function MyAttendanceScreen() {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;

  const query = useQuery({ queryKey: ['faculty-my-attendance', monthParam], queryFn: () => getMyAttendance(monthParam) });
  const today = query.data?.today;
  const todayBadge = statusBadge(today?.status ?? null);
  const summary = query.data?.summary;

  return (
    <View style={styles.flex}>
      <AppHeader title="My Attendance" subtitle={`${MONTH_NAMES[cursor.month]} ${cursor.year}`} onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={[styles.todayCard, cardShadow]}>
              <View style={styles.todayTop}>
                <View style={styles.todayIcon}>
                  <Text style={{ fontSize: 20 }}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.todayLabel}>TODAY</Text>
                  <Text style={styles.todayDate}>{today ? formatDate(today.date) : '—'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: todayBadge.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: todayBadge.fg }]}>{todayBadge.label}</Text>
                </View>
              </View>
              <View style={styles.punchRow}>
                <View style={styles.punchBox}>
                  <Text style={styles.punchLabel}>PUNCH IN</Text>
                  <Text style={styles.punchValue}>{today?.punchIn ?? '—'}</Text>
                </View>
                <View style={styles.punchBox}>
                  <Text style={styles.punchLabel}>PUNCH OUT</Text>
                  <Text style={styles.punchValue}>{today?.punchOut ?? '—'}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.rateCard, cardShadow]}>
              <View style={styles.rateTop}>
                <RingStat percent={summary?.ratePercent ?? 0} color={facultyColors.blue} trackColor={facultyColors.borderSoft} centerValue={summary?.ratePercent !== null && summary?.ratePercent !== undefined ? `${summary.ratePercent}%` : '—'} centerLabel="RATE" />
                <View style={styles.legend}>
                  <LegendRow color={facultyColors.green} label="Present" value={summary?.presentCount ?? 0} valueColor={facultyColors.greenDark} />
                  <LegendRow color={facultyColors.red} label="Absent" value={summary?.absentCount ?? 0} valueColor={facultyColors.redDark} />
                  <LegendRow color={facultyColors.blue} label="On duty" value={summary?.onDutyCount ?? 0} valueColor={facultyColors.blueDark} />
                </View>
              </View>
              <View style={styles.workingDaysRow}>
                <Text style={styles.workingDaysLabel}>Working days · {MONTH_NAMES[cursor.month]} {cursor.year}</Text>
                <Text style={styles.workingDaysValue}>{summary?.workingDays ?? 0}</Text>
              </View>
            </View>

            <View style={styles.monthNav}>
              <Pressable style={styles.monthArrow} onPress={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}>
                <ChevronLeftIcon />
              </Pressable>
              <Text style={styles.monthNavLabel}>{MONTH_NAMES[cursor.month]} {cursor.year}</Text>
              <Pressable style={styles.monthArrow} onPress={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}>
                <ChevronRightIcon />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>RECENT DAYS</Text>
            {(query.data?.days ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No attendance events recorded this month.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {(query.data?.days ?? []).map((d) => {
                  const badge = statusBadge(d.status);
                  return (
                    <View key={d.date} style={styles.dayRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.dayDate}>{formatDate(d.date)}</Text>
                        <Text style={styles.dayMeta}>
                          {d.status === 'PRESENT' ? `In ${d.punchIn ?? '—'} · Out ${d.punchOut ?? '—'}${d.hoursWorked !== null ? ` · ${d.hoursWorked}h` : ''}` : badge.label}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.fg }]}>{badge.label}</Text>
                      </View>
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

function LegendRow({ color, label, value, valueColor }: { color: string; label: string; value: number; valueColor: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={[styles.legendValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 12 },
  todayCard: { backgroundColor: facultyColors.surface, borderRadius: 16, padding: 16 },
  todayTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: facultyColors.greenBg, alignItems: 'center', justifyContent: 'center' },
  todayLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1 },
  todayDate: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, marginTop: 2 },
  statusBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  statusBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  punchRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  punchBox: { flex: 1, backgroundColor: facultyColors.rowBg, borderWidth: 1, borderColor: facultyColors.borderSoft, borderRadius: 11, padding: 10 },
  punchLabel: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.8 },
  punchValue: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, marginTop: 3 },
  rateCard: { backgroundColor: facultyColors.surface, borderRadius: 16, padding: 16 },
  rateTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  legendLabel: { flex: 1, fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.bodyMuted },
  legendValue: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  workingDaysRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, marginTop: 14, paddingTop: 11 },
  workingDaysLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.mutedStrong },
  workingDaysValue: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  monthArrow: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: '#E2E8F2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  monthNavLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.body },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 12 },
  dayDate: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  dayMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
});
