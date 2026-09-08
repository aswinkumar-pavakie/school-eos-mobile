// Student Attendance -- class-advisor-only daily roll call. Pixel-matches the
// design's own Attendance screen: class switcher, present-rate ring + legend,
// "Mark all present" / "Past records" action row (expandable real-history
// calendar), then the roll list with P/A toggles. Every tap on P/A persists
// immediately to the real backend (see faculty-attendance-api.ts) -- unlike
// the static design's own "fill locally, then Submit" mock, there is nothing
// left to submit once a tap lands, so the bottom bar is an honest live
// summary rather than a fake submit button.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { RingStat } from '@/components/faculty/RingStat';
import { ChevronLeftIcon, ChevronRightIcon, DoneAllIcon, HistoryIcon, CancelCircleIcon } from '@/components/faculty/icons';
import { listAdvisorSections } from '@/lib/faculty-scope-api';
import {
  getRoster,
  markAllPresent,
  markRecord,
  getHistory,
  type AttendanceRecord,
  type AttendanceHistoryDay,
} from '@/lib/faculty-attendance-api';
import { facultyColors, cardShadow } from '@/lib/theme';
import { initialsOf } from '@/lib/format';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StudentAttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sectionOverride, setSectionOverride] = useState<string | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = todayIso();

  const sectionsQuery = useQuery({ queryKey: ['faculty-advisor-sections'], queryFn: listAdvisorSections });
  // Derived, not effect-driven -- the user's own pick sticks once made;
  // otherwise the first real section is the sensible default the moment the
  // list loads, with no extra render pass needed to "catch up" to it.
  const sectionKey = sectionOverride ?? sectionsQuery.data?.[0]?.sectionId ?? null;

  const rosterQuery = useQuery({
    queryKey: ['faculty-attendance-roster', sectionKey, date],
    queryFn: () => getRoster(sectionKey!, date),
    enabled: !!sectionKey,
  });

  const monthStart = `${monthCursor.year}-${String(monthCursor.month + 1).padStart(2, '0')}-01`;
  const monthEndDate = new Date(monthCursor.year, monthCursor.month + 1, 0).getDate();
  const monthEnd = `${monthCursor.year}-${String(monthCursor.month + 1).padStart(2, '0')}-${String(monthEndDate).padStart(2, '0')}`;
  const historyQuery = useQuery({
    queryKey: ['faculty-attendance-history', sectionKey, monthStart, monthEnd],
    queryFn: () => getHistory(sectionKey!, monthStart, monthEnd),
    enabled: !!sectionKey && pastOpen,
  });

  const options = useMemo(
    () => (sectionsQuery.data ?? []).map((s) => ({ key: s.sectionId, label: `${s.gradeName} - ${s.sectionName}` })),
    [sectionsQuery.data],
  );

  const records = rosterQuery.data?.records ?? [];
  const present = records.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const total = records.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  async function handleMarkAllPresent() {
    if (!sectionKey) return;
    await markAllPresent(sectionKey, date);
    queryClient.invalidateQueries({ queryKey: ['faculty-attendance-roster', sectionKey, date] });
  }

  async function handleToggle(record: AttendanceRecord, status: 'PRESENT' | 'ABSENT') {
    if (!sectionKey || record.status === status) return;
    await markRecord(sectionKey, record.id, status);
    queryClient.invalidateQueries({ queryKey: ['faculty-attendance-roster', sectionKey, date] });
  }

  const historyByDate = useMemo(() => {
    const map = new Map<string, AttendanceHistoryDay>();
    for (const d of historyQuery.data ?? []) map.set(d.date.slice(0, 10), d);
    return map;
  }, [historyQuery.data]);

  const pickedDay = pickedDate ? historyByDate.get(pickedDate) : undefined;

  const firstDow = new Date(monthCursor.year, monthCursor.month, 1).getDay();
  const daysInMonth = new Date(monthCursor.year, monthCursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <View style={styles.flex}>
      <AppHeader title="Student Attendance" subtitle={options.find((o) => o.key === sectionKey)?.label ?? ''} onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={rosterQuery.isFetching} onRefresh={() => rosterQuery.refetch()} />}
      >
        {sectionsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : options.length === 0 ? (
          <Text style={styles.emptyText}>You are not the class advisor for any section.</Text>
        ) : (
          <>
            <ClassSwitcher options={options} selectedKey={sectionKey} onSelect={setSectionOverride} />

            {rosterQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
            ) : (
              <>
                <View style={[styles.summaryCard, cardShadow]}>
                  <View style={styles.summaryTop}>
                    <RingStat percent={pct} centerValue={`${pct}%`} centerLabel="PRESENT" />
                    <View style={styles.legend}>
                      <LegendRow color={facultyColors.green} label="Present" value={present} valueColor={facultyColors.greenDark} />
                      <LegendRow color={facultyColors.red} label="Absent" value={absent} valueColor={facultyColors.redDark} />
                      <LegendRow color={facultyColors.mutedStrong} label="Class strength" value={total} valueColor={facultyColors.body} />
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable style={styles.actionBtn} onPress={handleMarkAllPresent}>
                      <DoneAllIcon />
                      <Text style={styles.actionText}>Mark all present</Text>
                    </Pressable>
                    <View style={styles.actionDivider} />
                    <Pressable style={styles.actionBtn} onPress={() => setPastOpen((o) => !o)}>
                      <HistoryIcon />
                      <Text style={[styles.actionText, { color: facultyColors.mutedStrong }]}>Past records</Text>
                    </Pressable>
                  </View>

                  {pastOpen ? (
                    <View style={styles.pastPanel}>
                      <View style={styles.monthNav}>
                        <Pressable
                          style={styles.monthArrow}
                          onPress={() => { setPickedDate(null); setMonthCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })); }}
                        >
                          <ChevronLeftIcon />
                        </Pressable>
                        <Text style={styles.monthLabel}>{MONTH_NAMES[monthCursor.month]} {monthCursor.year}</Text>
                        <Pressable
                          style={styles.monthArrow}
                          onPress={() => { setPickedDate(null); setMonthCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })); }}
                        >
                          <ChevronRightIcon />
                        </Pressable>
                      </View>
                      <View style={styles.dowRow}>
                        {DOW.map((w, i) => (
                          <Text key={i} style={styles.dowLabel}>{w}</Text>
                        ))}
                      </View>
                      <View style={styles.calGrid}>
                        {cells.map((day, i) => {
                          if (day === null) return <View key={i} style={styles.calCellWrap} />;
                          const iso = `${monthCursor.year}-${String(monthCursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const hasData = historyByDate.has(iso);
                          const isPicked = pickedDate === iso;
                          return (
                            <Pressable key={i} style={styles.calCellWrap} onPress={() => hasData && setPickedDate(iso)} disabled={!hasData}>
                              <View
                                style={[
                                  styles.calCell,
                                  hasData && { backgroundColor: facultyColors.blueLight },
                                  isPicked && { backgroundColor: facultyColors.blue },
                                ]}
                              >
                                <Text style={[styles.calCellText, isPicked && { color: '#fff' }]}>{day}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                      {!pickedDay ? (
                        <Text style={styles.pastPrompt}>Pick a highlighted date to see that day&apos;s attendance</Text>
                      ) : (
                        <View style={styles.pastDetail}>
                          <Text style={styles.pastDetailDate}>{pickedDate}</Text>
                          <View style={styles.pastDetailStats}>
                            <View style={[styles.pastStat, { backgroundColor: '#F0FDF4' }]}>
                              <Text style={[styles.pastStatLabel, { color: facultyColors.green }]}>PRESENT</Text>
                              <Text style={[styles.pastStatValue, { color: facultyColors.greenDark }]}>{pickedDay.present}</Text>
                            </View>
                            <View style={[styles.pastStat, { backgroundColor: '#FEF2F2' }]}>
                              <Text style={[styles.pastStatLabel, { color: facultyColors.red }]}>ABSENT</Text>
                              <Text style={[styles.pastStatValue, { color: facultyColors.redDark }]}>{pickedDay.absent}</Text>
                            </View>
                            <View style={[styles.pastStat, { backgroundColor: '#F1F5FB' }]}>
                              <Text style={[styles.pastStatLabel, { color: facultyColors.mutedStrong }]}>RATE</Text>
                              <Text style={[styles.pastStatValue, { color: facultyColors.body }]}>
                                {pickedDay.total > 0 ? Math.round((pickedDay.present / pickedDay.total) * 100) : 0}%
                              </Text>
                            </View>
                          </View>
                          {pickedDay.absentees.length > 0 ? (
                            <>
                              <Text style={styles.absenteesLabel}>ABSENTEES</Text>
                              {pickedDay.absentees.map((ab) => (
                                <View key={ab.studentId} style={styles.absenteeRow}>
                                  <CancelCircleIcon size={16} />
                                  <Text style={styles.absenteeName}>{[ab.firstName, ab.lastName].filter(Boolean).join(' ')}</Text>
                                  <Text style={styles.absenteeRoll}>{ab.rollNo ?? '—'}</Text>
                                </View>
                              ))}
                            </>
                          ) : null}
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>

                <Text style={styles.rollListLabel}>ROLL LIST</Text>
                <View style={{ gap: 8 }}>
                  {records.map((r) => (
                    <RollRow key={r.id} record={r} onToggle={handleToggle} />
                  ))}
                </View>

                <View style={styles.footerBar}>
                  <Text style={styles.footerText}>{present} present · {absent} absent</Text>
                </View>
              </>
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

function RollRow({ record, onToggle }: { record: AttendanceRecord; onToggle: (r: AttendanceRecord, s: 'PRESENT' | 'ABSENT') => void }) {
  const isPresent = ['PRESENT', 'LATE', 'HALF_DAY'].includes(record.status);
  const isAbsent = record.status === 'ABSENT';
  return (
    <View style={styles.rollRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(record.firstName, record.lastName)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rollName} numberOfLines={1}>{[record.firstName, record.lastName].filter(Boolean).join(' ')}</Text>
        <Text style={styles.rollNo}>Roll {record.rollNo ?? '—'}</Text>
      </View>
      <View style={styles.paGroup}>
        <Pressable style={[styles.paBtn, isPresent && styles.paBtnPresent]} onPress={() => onToggle(record, 'PRESENT')}>
          <Text style={[styles.paBtnText, isPresent && { color: '#fff' }]}>P</Text>
        </Pressable>
        <Pressable style={[styles.paBtn, isAbsent && styles.paBtnAbsent]} onPress={() => onToggle(record, 'ABSENT')}>
          <Text style={[styles.paBtnText, isAbsent && { color: '#fff' }]}>A</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 40, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  summaryCard: { backgroundColor: facultyColors.surface, borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  legend: { flex: 1, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  legendLabel: { flex: 1, fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.bodyMuted },
  legendValue: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: facultyColors.borderSoft },
  actionBtn: { flex: 1, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blue },
  actionDivider: { width: 1, backgroundColor: facultyColors.borderSoft },
  pastPanel: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, backgroundColor: facultyColors.rowBg, padding: 14 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: '#E2E8F2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  dowRow: { flexDirection: 'row', marginTop: 12 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#A8B1C1', paddingBottom: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCellWrap: { width: `${100 / 7}%`, height: 34, alignItems: 'center', justifyContent: 'center' },
  calCell: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  calCellText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.body },
  pastPrompt: { marginTop: 10, textAlign: 'center', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
  pastDetail: { marginTop: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 14 },
  pastDetailDate: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  pastDetailStats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pastStat: { flex: 1, borderRadius: 10, padding: 9 },
  pastStatLabel: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.8 },
  pastStatValue: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 },
  absenteesLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  absenteeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  absenteeName: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.ink },
  absenteeRoll: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted },
  rollListLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  rollRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 11, backgroundColor: facultyColors.surface },
  avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: facultyColors.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  rollName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rollNo: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  paGroup: { flexDirection: 'row', gap: 4, backgroundColor: facultyColors.borderSoft, borderRadius: 12, padding: 4 },
  paBtn: { width: 40, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  paBtnPresent: { backgroundColor: facultyColors.green },
  paBtnAbsent: { backgroundColor: facultyColors.red },
  paBtnText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.mutedStrong },
  footerBar: { marginTop: 8, alignItems: 'center', paddingVertical: 8 },
  footerText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.mutedStrong },
});
