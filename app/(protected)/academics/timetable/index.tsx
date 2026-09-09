// Timetable -- real published slots for the student's own section
// (parent-academic.controller.ts's /timetable route). Days shown are derived
// from whichever dayOfWeek values actually appear in the real slots, never
// hardcoded to a Mon-Sat week. Pixel reference: "School App.dc.html"
// isTimetable block (lines 846-881) -- the Calendar/Homework/Exams/Subjects
// quick-action row in that mock is dropped here: only Calendar has a real
// screen in this build, and guessing routes for the other three (built
// separately, elsewhere) would risk dead links.

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { getTimetable, type TimetablePeriod, type TimetableSlot } from '@/lib/parent-api';
import { parentColors } from '@/lib/theme';

const DOW_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dateForDayOfWeek(day: number): Date {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  base.setDate(base.getDate() + (day - base.getDay()));
  return base;
}

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatPeriodTime(value: string): string {
  const mins = parseTimeToMinutes(value);
  const period = mins >= 12 * 60 ? 'PM' : 'AM';
  const hours24 = Math.floor(mins / 60);
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = (mins % 60).toString().padStart(2, '0');
  return `${hours12}:${minutes} ${period}`;
}

export default function TimetableScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayInitialized, setDayInitialized] = useState(false);

  const timetableQuery = useQuery({
    queryKey: ['timetable', studentId],
    queryFn: () => getTimetable(studentId!),
    enabled: !!studentId,
  });

  const periods = timetableQuery.data?.periods ?? [];
  const slots = timetableQuery.data?.slots ?? [];
  const availableDays = Array.from(new Set(slots.map((s) => s.dayOfWeek))).sort((a, b) => a - b);

  if (!dayInitialized && availableDays.length > 0) {
    setDayInitialized(true);
    const today = new Date().getDay();
    setSelectedDay(availableDays.includes(today) ? today : availableDays[0]!);
  }

  const dayPeriods = periods
    .slice()
    .sort((a, b) => a.periodNo - b.periodNo)
    .map((period) => ({
      period,
      slot: slots.find((s) => s.dayOfWeek === selectedDay && s.periodId === period.periodId) ?? null,
    }))
    .filter((row) => row.period.isBreak || row.slot);

  const now = new Date();
  const todayDow = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const subtitle =
    selectedDay != null
      ? `${WEEKDAY_LONG[selectedDay]}, ${dateForDayOfWeek(selectedDay).getDate()} ${MONTH_LONG[dateForDayOfWeek(selectedDay).getMonth()]}`
      : undefined;

  return (
    <View style={styles.flex}>
      <AppHeader title="Timetable" subtitle={subtitle} onBack={() => router.back()} />
      {!selected || timetableQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={styles.spinner} />
      ) : availableDays.length === 0 ? (
        <Text style={styles.emptyText}>No timetable published yet.</Text>
      ) : (
        <View style={styles.content}>
          <View style={styles.dayRow}>
            {availableDays.map((day) => {
              const active = day === selectedDay;
              const date = dateForDayOfWeek(day);
              return (
                <Pressable key={day} style={[styles.dayTile, active && styles.dayTileActive]} onPress={() => setSelectedDay(day)}>
                  <Text style={[styles.dayDow, active && styles.dayDowActive]}>{DOW_SHORT[day]}</Text>
                  <Text style={[styles.dayNum, active && styles.dayNumActive]}>{date.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>

          {dayPeriods.length === 0 ? (
            <Text style={styles.emptyText}>No periods scheduled for this day.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {dayPeriods.map(({ period, slot }) =>
                period.isBreak ? (
                  <BreakRow key={period.periodId} period={period} />
                ) : (
                  <PeriodRow
                    key={period.periodId}
                    period={period}
                    slot={slot!}
                    isNow={
                      selectedDay === todayDow &&
                      nowMinutes >= parseTimeToMinutes(period.startTime) &&
                      nowMinutes < parseTimeToMinutes(period.endTime)
                    }
                  />
                ),
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function BreakRow({ period }: { period: TimetablePeriod }) {
  return (
    <View style={styles.breakRow}>
      <Text style={styles.breakLabel}>{period.label}</Text>
      <Text style={styles.breakTime}>
        {formatPeriodTime(period.startTime)} – {formatPeriodTime(period.endTime)}
      </Text>
    </View>
  );
}

function PeriodRow({ period, slot, isNow }: { period: TimetablePeriod; slot: TimetableSlot; isNow: boolean }) {
  return (
    <View style={[styles.periodCard, isNow && styles.periodCardActive]}>
      <View style={styles.periodTimeCol}>
        <Text style={[styles.periodTime, isNow && styles.periodTextActive]}>{formatPeriodTime(period.startTime)}</Text>
        <Text style={[styles.periodSlot, isNow && styles.periodSubActive]}>{period.label}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.periodSubject, isNow && styles.periodTextActive]}>{slot.subjectName}</Text>
        <Text style={[styles.periodTeacher, isNow && styles.periodSubActive]}>
          {[slot.teacherName, slot.room].filter(Boolean).join(' · ') || '—'}
        </Text>
      </View>
      {isNow ? (
        <View style={styles.nowPill}>
          <Text style={styles.nowPillText}>NOW</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  spinner: { marginTop: 24 },
  content: { padding: 16, paddingTop: 14, gap: 14, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  dayRow: { flexDirection: 'row', gap: 7 },
  dayTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: parentColors.border,
    backgroundColor: '#fff',
  },
  dayTileActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  dayDow: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5, color: parentColors.mutedLight },
  dayDowActive: { color: 'rgba(255,255,255,0.8)' },
  dayNum: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 3, color: parentColors.ink },
  dayNumActive: { color: '#fff' },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: parentColors.pillNeutralBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  breakLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  breakTime: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.bodyMuted },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: parentColors.border,
    backgroundColor: '#fff',
    padding: 12,
    paddingHorizontal: 16,
  },
  periodCardActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  periodTimeCol: { width: 66 },
  periodTime: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 18, color: parentColors.ink },
  periodSlot: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 3, color: parentColors.muted },
  periodSubject: { fontSize: 16.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  periodTeacher: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3, color: parentColors.muted },
  periodTextActive: { color: '#fff' },
  periodSubActive: { color: 'rgba(255,255,255,0.8)' },
  nowPill: { backgroundColor: 'rgba(255,255,255,0.22)', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99 },
  nowPillText: { color: '#fff', fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
