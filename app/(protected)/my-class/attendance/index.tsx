// Pixel replica of the design reference's isAttendance block -- percent summary
// card + monthly calendar grid + legend -- wired to the real
// GET /parent/students/:id/attendance endpoint (month-scoped summary + day
// records). The design's own top card shows a separate "term" total from the
// calendar's per-month total, but the real endpoint only ever returns one
// month-scoped summary, so both slots here share that same real value rather
// than inventing a second, fake term aggregate.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { getAttendance } from '@/lib/parent-api';
import { parentColors, cardShadow } from '@/lib/theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PRESENT: { bg: parentColors.pillNeutralBg, color: parentColors.bodyMuted, label: 'Present' },
  ABSENT: { bg: parentColors.blueDeep, color: '#fff', label: 'Absent' },
  HOLIDAY: { bg: parentColors.background, color: parentColors.checkboxOff, label: 'Holiday' },
  LATE: { bg: parentColors.amberBg, color: parentColors.amberDark, label: 'Late' },
  HALF_DAY: { bg: parentColors.amberBg, color: parentColors.amberDark, label: 'Half day' },
  ON_LEAVE: { bg: parentColors.greenBg, color: parentColors.greenDark, label: 'On leave' },
};
const BASE_LEGEND = ['PRESENT', 'ABSENT', 'HOLIDAY'];

function styleForStatus(status?: string): { bg: string; color: string } {
  if (!status) return { bg: parentColors.background, color: parentColors.checkboxOff };
  return STATUS_STYLE[status] ?? { bg: parentColors.pillNeutralBg, color: parentColors.bodyMuted };
}

function labelForStatus(status?: string): string {
  if (!status) return 'No record';
  if (STATUS_STYLE[status]) return STATUS_STYLE[status]!.label;
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ArrowLeft({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Path d="M14 6l-6 6 6 6" />
    </Svg>
  );
}

function ArrowRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Path d="M10 6l6 6-6 6" />
    </Svg>
  );
}

type CalendarCell = { day: number; date: string; status?: string } | null;

export default function AttendanceScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;

  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const anchor = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const anchorYear = anchor.getFullYear();
  const anchorMonth = anchor.getMonth();
  const monthParam = `${anchorYear}-${pad2(anchorMonth + 1)}`;

  const attendanceQuery = useQuery({
    queryKey: ['attendance', studentId, monthParam],
    queryFn: () => getAttendance(studentId!, monthParam),
    enabled: !!studentId,
  });

  const summary = attendanceQuery.data?.summary;
  const days = useMemo(() => attendanceQuery.data?.days ?? [], [attendanceQuery.data]);
  const daysByDate = useMemo(() => new Map(days.map((d) => [d.date, d.status])), [days]);

  const cells = useMemo<CalendarCell[]>(() => {
    const firstWeekday = new Date(anchorYear, anchorMonth, 1).getDay();
    const daysInMonth = new Date(anchorYear, anchorMonth + 1, 0).getDate();
    const list: CalendarCell[] = [];
    for (let i = 0; i < firstWeekday; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${anchorYear}-${pad2(anchorMonth + 1)}-${pad2(d)}`;
      list.push({ day: d, date, status: daysByDate.get(date) });
    }
    return list;
  }, [anchorYear, anchorMonth, daysByDate]);

  const extraStatuses = useMemo(() => {
    const found = new Set<string>();
    for (const d of days) if (!BASE_LEGEND.includes(d.status)) found.add(d.status);
    return Array.from(found);
  }, [days]);

  if (!selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Attendance" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const subtitle = [selected.gradeName, selected.sectionName ? `Section ${selected.sectionName}` : null]
    .filter(Boolean)
    .join(' · ');
  const monthLabel = `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  const clampedPercent = summary ? Math.max(0, Math.min(100, summary.percentage)) : 0;
  const selectedNote = selectedDay
    ? (() => {
        const d = new Date(selectedDay);
        return `${d.getDate()} ${monthLabel} · ${labelForStatus(daysByDate.get(selectedDay))}`;
      })()
    : "Tap a date to see that day's record";

  return (
    <View style={styles.flex}>
      <AppHeader title="Attendance" subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={attendanceQuery.isFetching} onRefresh={() => attendanceQuery.refetch()} />}
      >
        <View style={[styles.card, cardShadow]}>
          <View style={styles.topRow}>
            <Text style={styles.percentText}>{summary ? Math.round(summary.percentage) : '—'}%</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.presentText}>
                {summary?.presentCount ?? 0}
                <Text style={styles.presentTextMuted}> / {summary?.totalCount ?? 0}</Text>
              </Text>
              <Text style={styles.presentLabel}>days present</Text>
            </View>
          </View>
          <Text style={styles.termLine}>Attendance for {monthLabel}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${clampedPercent}%` }]} />
            <View style={styles.progressMarker} />
          </View>
          <Text style={styles.markerNote}>Marker shows the 85% requirement</Text>
        </View>

        <View style={[styles.card, cardShadow, { paddingHorizontal: 16 }]}>
          <View style={styles.monthHeaderRow}>
            <Pressable style={styles.navCircle} onPress={() => { setMonthOffset((v) => v - 1); setSelectedDay(null); }} hitSlop={6}>
              <ArrowLeft color={parentColors.blueDeep} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.monthLabel} numberOfLines={1}>{monthLabel}</Text>
              <Text style={styles.monthSub} numberOfLines={1}>
                {summary?.presentCount ?? 0} / {summary?.totalCount ?? 0} days present
              </Text>
            </View>
            <Pressable
              style={[styles.navCircle, monthOffset >= 0 && styles.navCircleDisabled]}
              onPress={() => { if (monthOffset < 0) { setMonthOffset((v) => v + 1); setSelectedDay(null); } }}
              hitSlop={6}
              disabled={monthOffset >= 0}
            >
              <ArrowRight color={monthOffset >= 0 ? parentColors.mutedLight : parentColors.blueDeep} />
            </Pressable>
          </View>

          <View style={styles.weekHeaderRow}>
            {WEEKDAY_LETTERS.map((letter, i) => (
              <Text key={i} style={styles.weekHeaderText}>{letter}</Text>
            ))}
          </View>

          {attendanceQuery.isLoading ? (
            <ActivityIndicator color={parentColors.blue} style={{ marginTop: 20, marginBottom: 8 }} />
          ) : (
            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                if (!cell) return <View key={idx} style={styles.cell} />;
                const { bg, color } = styleForStatus(cell.status);
                const isSelected = selectedDay === cell.date;
                return (
                  <Pressable
                    key={idx}
                    style={styles.cell}
                    onPress={() => setSelectedDay((prev) => (prev === cell.date ? null : cell.date))}
                  >
                    <View style={[styles.cellBox, { backgroundColor: bg }, isSelected && styles.cellSelected]}>
                      <Text style={[styles.cellText, { color }]}>{cell.day}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={styles.dayNote}>{selectedNote}</Text>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: parentColors.pillNeutralBg, borderWidth: 1, borderColor: '#DFE6F1' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: parentColors.blueDeep }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: parentColors.background, borderWidth: 1, borderColor: parentColors.borderSoft }]} />
              <Text style={styles.legendText}>Holiday</Text>
            </View>
            {extraStatuses.map((status) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: styleForStatus(status).bg }]} />
                <Text style={styles.legendText}>{labelForStatus(status)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footerNote}>85% attendance is required to appear for the term examinations.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  percentText: { fontSize: 38, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep, letterSpacing: -0.4 },
  presentText: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  presentTextMuted: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted },
  presentLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  termLine: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedSoft, marginTop: 12 },
  progressTrack: {
    height: 10,
    borderRadius: 99,
    backgroundColor: parentColors.borderSoft,
    marginTop: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: parentColors.blueDeep, borderRadius: 99 },
  progressMarker: { position: 'absolute', left: '85%', top: 0, bottom: 0, width: 2, backgroundColor: '#fff' },
  markerNote: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 10 },
  monthHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18 },
  navCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: parentColors.pillNeutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCircleDisabled: { backgroundColor: parentColors.borderSoft },
  monthLabel: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  monthSub: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, marginTop: 3 },
  weekHeaderRow: { flexDirection: 'row', marginTop: 16 },
  weekHeaderText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: parentColors.mutedLight,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  cellBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { borderWidth: 2, borderColor: parentColors.blue },
  cellText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  dayNote: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.bodyMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  legendRow: {
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
    marginTop: 16,
    paddingTop: 14,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 18,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendSwatch: { width: 16, height: 16, borderRadius: 5 },
  legendText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.bodyMuted },
  footerNote: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.muted,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
