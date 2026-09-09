// Academic Calendar -- pixel-matches the provided design reference: a real
// month-grid (not just a flat list), event days highlighted from the real
// calendar_event table, today marked from the real device date, and a "this
// month" list below. The header's own "Semester" line is the real current
// academic_year's name + real date range -- no semester/term table exists in
// this schema, so nothing here is invented to fill that slot.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { listCalendarEvents, type CalendarEvent } from '@/lib/faculty-calendar-api';
import { facultyColors, parentColors, cardShadow } from '@/lib/theme';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const EVENT_TYPE_LABELS: Record<string, string> = {
  HOLIDAY: 'Holiday', TERM_START: 'Term start', TERM_END: 'Term end', EXAM_WINDOW: 'Exam window',
  PTM: 'Parent-Teacher Meeting', FUNCTION: 'Function', COMPETITION: 'Competition',
  WORKING_SATURDAY: 'Working Saturday', OTHER: 'Event',
};

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
      <Path d="M14 6l-6 6 6 6" />
    </Svg>
  );
}
function ChevronLeftIcon({ color = parentColors.blueDeep }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}
function ChevronRightIcon({ color = parentColors.blueDeep }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
function dateKey(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}
function monthKey(y: number, m0: number): string {
  return `${y}-${pad2(m0 + 1)}`;
}

// Stable reference (not a fresh `[]` literal per render) so the useMemo hooks
// below that depend on `events` don't get invalidated on every render while
// query.data is still undefined/loading.
const EMPTY_EVENTS: CalendarEvent[] = [];

export default function AcademicCalendarScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const query = useQuery({ queryKey: ['faculty-calendar'], queryFn: listCalendarEvents });
  const events = query.data?.events ?? EMPTY_EVENTS;
  const academicYear = query.data?.academicYear ?? null;

  const monthStartStr = dateKey(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEndStr = dateKey(viewYear, viewMonth, daysInMonth);

  const monthEvents = events
    .filter((e) => e.startDate <= monthEndStr && e.endDate >= monthStartStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Real event-day lookup -- expands each event's own [startDate,endDate]
  // range so a multi-day event (e.g. a real week-long vacation) highlights
  // every real day it spans, not just its start.
  const eventDaySet = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      let cursor = new Date(`${e.startDate}T00:00:00`);
      const end = new Date(`${e.endDate}T00:00:00`);
      let guard = 0;
      while (cursor <= end && guard < 400) {
        set.add(dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
        guard += 1;
      }
    }
    return set;
  }, [events]);

  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoPrev = !academicYear || monthKey(viewYear, viewMonth) > monthKey(new Date(academicYear.startDate).getFullYear(), new Date(academicYear.startDate).getMonth());
  const canGoNext = !academicYear || monthKey(viewYear, viewMonth) < monthKey(new Date(academicYear.endDate).getFullYear(), new Date(academicYear.endDate).getMonth());

  function goPrev() {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); } else { setViewMonth((m) => m - 1); }
  }
  function goNext() {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); } else { setViewMonth((m) => m + 1); }
  }

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[parentColors.gradientStart, parentColors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.replace('/academics' as never)} style={styles.backButton} hitSlop={8}>
              <BackIcon />
            </Pressable>
            <View style={styles.textCol}>
              <Text style={styles.title}>Academic Calendar</Text>
              <Text style={styles.subtitle}>
                {academicYear ? `${academicYear.name} · ${MONTH_NAMES[new Date(academicYear.startDate).getMonth()]!.slice(0, 3)} ${new Date(academicYear.startDate).getFullYear()} – ${MONTH_NAMES[new Date(academicYear.endDate).getMonth()]!.slice(0, 3)} ${new Date(academicYear.endDate).getFullYear()}` : 'Loading…'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}>
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={[styles.gridCard, cardShadow]}>
              <View style={styles.monthNavRow}>
                <Pressable onPress={goPrev} disabled={!canGoPrev} style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}>
                  <ChevronLeftIcon color={canGoPrev ? parentColors.blueDeep : facultyColors.disabled} />
                </Pressable>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                  <Text style={styles.monthEventCount}>{monthEvents.length} EVENT{monthEvents.length === 1 ? '' : 'S'}</Text>
                </View>
                <Pressable onPress={goNext} disabled={!canGoNext} style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}>
                  <ChevronRightIcon color={canGoNext ? parentColors.blueDeep : facultyColors.disabled} />
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAY_LETTERS.map((w, i) => (
                  <Text key={i} style={styles.weekdayLabel}>{w}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (day === null) return <View key={i} style={styles.dayCell} />;
                  const key = dateKey(viewYear, viewMonth, day);
                  const hasEvent = eventDaySet.has(key);
                  const isToday = key === todayKey;
                  return (
                    <View key={i} style={styles.dayCell}>
                      <View style={[styles.dayCircle, hasEvent && styles.dayCircleEvent, isToday && styles.dayCircleToday]}>
                        <Text style={[styles.dayNumber, hasEvent && styles.dayNumberEvent]}>{day}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text style={styles.sectionLabel}>THIS MONTH</Text>
            {monthEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events this month.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {monthEvents.map((e: CalendarEvent) => {
                  const start = new Date(`${e.startDate}T00:00:00`);
                  const subtitle = `${EVENT_TYPE_LABELS[e.eventType] ?? e.eventType}${e.description ? ` · ${e.description}` : ''}`;
                  return (
                    <View key={e.id} style={styles.eventCard}>
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeDay}>{start.getDate()}</Text>
                        <Text style={styles.dateBadgeMonth}>{MONTH_ABBR[start.getMonth()]}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.eventTitle} numberOfLines={2}>{e.title}</Text>
                        <Text style={styles.eventSubtitle} numberOfLines={2}>{subtitle}</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  title: { color: '#fff', fontSize: 21, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 4 },
  gridCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 18, padding: 16 },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: parentColors.pillBlueBg, alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { backgroundColor: facultyColors.borderSoft },
  monthTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  monthEventCount: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.8, marginTop: 3 },
  weekdayRow: { flexDirection: 'row', marginTop: 16 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleEvent: { backgroundColor: parentColors.blue },
  dayCircleToday: { borderWidth: 1.6, borderColor: parentColors.blue },
  dayNumber: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.body },
  dayNumberEvent: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginLeft: 2 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  dateBadge: { width: 46, alignItems: 'center' },
  dateBadgeDay: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blue },
  dateBadgeMonth: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted, letterSpacing: 0.5, marginTop: 1 },
  eventTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  eventSubtitle: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
});
