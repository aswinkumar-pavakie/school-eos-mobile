// Timetable -- pixel-matches the provided design reference exactly (gradient
// header with an embedded day-strip showing real calendar dates, 3 stat
// cards, Forenoon/Afternoon period cards with a blue left accent). Every
// number on this screen is derived live from the real timetable_slot/
// timetable_period tables -- no fabricated room/lab text: a period with no
// real `room` value simply omits that line rather than inventing one.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { StatCards } from '@/components/faculty/StatCards';
import { getWeeklyTimetable, type TimetableSlot } from '@/lib/faculty-timetable-api';
import { facultyColors, parentColors } from '@/lib/theme';

const DAY_SHORT: Record<number, string> = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };
const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
      <Path d="M14 6l-6 6 6 6" />
    </Svg>
  );
}

/** 1=Mon..6=Sat for any real date, folding Sunday into Saturday's slot --
 * same convention the rest of this screen's own real school-week already uses. */
function dowOf(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** The real Mon-Sat dates of the week containing `ref` (today, always). */
function weekDatesOf(ref: Date): Date[] {
  const monday = addDays(ref, -(dowOf(ref) - 1));
  return [0, 1, 2, 3, 4, 5].map((i) => addDays(monday, i));
}

function formatTime12h(hhmmss: string): string {
  const [hStr, mStr] = hhmmss.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

export default function TimetableScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState(() => dowOf(today));
  const weekDates = useMemo(() => weekDatesOf(today), [today]);
  const query = useQuery({ queryKey: ['faculty-timetable'], queryFn: getWeeklyTimetable });

  const selectedDate = weekDates[selectedDay - 1] ?? today;
  const daySlots = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    const found = query.data?.days.find((d) => d.dayOfWeek === selectedDay);
    for (const s of found?.slots ?? []) map.set(s.periodId, s);
    return map;
  }, [query.data, selectedDay]);

  const periods = query.data?.periods ?? [];
  const breakIndex = periods.findIndex((p) => p.isBreak);
  const forenoon = breakIndex === -1 ? periods : periods.slice(0, breakIndex);
  const afternoon = breakIndex === -1 ? [] : periods.slice(breakIndex + 1);
  const breakPeriod = breakIndex === -1 ? null : periods[breakIndex];

  const nonBreak = periods.filter((p) => !p.isBreak);
  const classesCount = nonBreak.filter((p) => daySlots.has(p.periodId)).length;
  const freeCount = nonBreak.length - classesCount;
  const labsCount = nonBreak.filter((p) => daySlots.get(p.periodId)?.isPractical).length;

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[parentColors.gradientStart, parentColors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.replace('/academics' as never)} style={styles.backButton} hitSlop={8}>
              <BackIcon />
            </Pressable>
            <View style={styles.textCol}>
              <Text style={styles.title}>Timetable</Text>
              <Text style={styles.subtitle}>{WEEKDAY_NAMES[selectedDay]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]}</Text>
            </View>
          </View>
          <View style={styles.dayRow}>
            {[1, 2, 3, 4, 5, 6].map((d) => {
              const active = d === selectedDay;
              const date = weekDates[d - 1]!;
              return (
                <Pressable key={d} style={[styles.dayPill, active && styles.dayPillActive]} onPress={() => setSelectedDay(d)}>
                  <Text style={[styles.dayPillLabel, active && styles.dayPillLabelActive]}>{DAY_SHORT[d]}</Text>
                  <Text style={[styles.dayPillDate, active && styles.dayPillDateActive]}>{date.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}>
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : periods.length === 0 ? (
          <Text style={styles.emptyText}>No timetable periods configured yet.</Text>
        ) : (
          <>
            <StatCards items={[
              { label: 'CLASSES', value: String(classesCount) },
              { label: 'FREE', value: String(freeCount) },
              { label: 'LABS', value: String(labsCount) },
            ]} />

            {forenoon.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>FORENOON</Text>
                <View style={{ gap: 10 }}>
                  {forenoon.map((p) => (
                    <PeriodCard key={p.periodId} period={p} slot={daySlots.get(p.periodId)} />
                  ))}
                </View>
              </>
            ) : null}

            {breakPeriod && afternoon.length > 0 ? (
              <Text style={styles.breakDivider}>{breakPeriod.label ?? 'Break'} · {breakPeriod.startTime.slice(0, 5)} – {breakPeriod.endTime.slice(0, 5)}</Text>
            ) : null}

            {afternoon.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>AFTERNOON</Text>
                <View style={{ gap: 10 }}>
                  {afternoon.map((p) => (
                    <PeriodCard key={p.periodId} period={p} slot={daySlots.get(p.periodId)} />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PeriodCard({ period, slot }: { period: { periodId: string; periodNo: number; label: string | null; startTime: string; endTime: string; isBreak: boolean }; slot?: TimetableSlot }) {
  if (period.isBreak) {
    return (
      <View style={[styles.periodCard, styles.periodCardBreak]}>
        <View style={styles.periodTimeCol}>
          <Text style={styles.periodTime}>{formatTime12h(period.startTime)}</Text>
        </View>
        <View style={styles.periodDivider} />
        <Text style={styles.breakLabel}>{period.label ?? 'Break'}</Text>
      </View>
    );
  }
  return (
    <View style={styles.periodCard}>
      <View style={styles.periodTimeCol}>
        <Text style={styles.periodTime}>{formatTime12h(period.startTime)}</Text>
        <Text style={styles.periodNo}>P{period.periodNo}</Text>
      </View>
      <View style={styles.periodDivider} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {slot ? (
          <>
            <Text style={styles.slotTitle} numberOfLines={1}>{slot.subjectName} · {slot.gradeName} {slot.sectionName}</Text>
            {slot.room ? <Text style={styles.slotMeta}>{slot.room}</Text> : null}
          </>
        ) : (
          <Text style={styles.freeLabel}>Free · {period.label ?? `Period ${period.periodNo}`}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  title: { color: '#fff', fontSize: 21, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  dayRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 18, gap: 6 },
  dayPill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)' },
  dayPillActive: { backgroundColor: '#fff' },
  dayPillLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  dayPillLabelActive: { color: parentColors.blueDeep },
  dayPillDate: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff', marginTop: 2 },
  dayPillDateActive: { color: parentColors.blueDeep },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginLeft: 2 },
  breakDivider: { textAlign: 'center', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.mutedStrong, fontStyle: 'italic' },
  periodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: facultyColors.surface,
    borderWidth: 1, borderColor: facultyColors.border, borderLeftWidth: 4, borderLeftColor: facultyColors.blue,
    borderRadius: 14, padding: 13,
  },
  periodCardBreak: { borderLeftColor: facultyColors.borderLight, backgroundColor: facultyColors.rowBg },
  periodTimeCol: { width: 66, alignItems: 'flex-start' },
  periodTime: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  periodNo: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  periodDivider: { width: 1, alignSelf: 'stretch', backgroundColor: facultyColors.borderSoft },
  breakLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.mutedStrong, fontStyle: 'italic' },
  slotTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  slotMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  freeLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
});
