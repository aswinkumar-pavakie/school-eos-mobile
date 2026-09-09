// Pixel replica of the design reference's isExams block (hall ticket banner +
// term exam schedule list) -- real GET /parent/students/:id/exams. The design's
// own hall ticket copy invents a room/seat/roll assignment and reporting time
// the real ExamScheduleRow never carries (it only has a per-subject exam room),
// so this screen swaps that banner for an honest "next exam" summary built from
// real schedule rows instead of fabricating seat/roll numbers.

import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { formatDate, formatTime } from '@/lib/format';
import { getExamSchedule, type ExamScheduleRow } from '@/lib/parent-api';
import { parentColors } from '@/lib/theme';

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function dayMonTile(dateStr: string | null): { day: string; mon: string } {
  if (!dateStr) return { day: '--', mon: 'TBA' };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { day: '--', mon: 'TBA' };
  return { day: String(d.getDate()), mon: MONTH_SHORT[d.getMonth()]! };
}

export default function ExamsScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;

  const scheduleQuery = useQuery({
    queryKey: ['exam-schedule', studentId],
    queryFn: () => getExamSchedule(studentId!),
    enabled: !!studentId,
  });

  const rows = useMemo(() => scheduleQuery.data ?? [], [scheduleQuery.data]);

  const groups = useMemo(() => {
    const map = new Map<string, ExamScheduleRow[]>();
    for (const row of rows) {
      const list = map.get(row.examName) ?? [];
      list.push(row);
      map.set(row.examName, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (!a.examDate && !b.examDate) return 0;
        if (!a.examDate) return 1;
        if (!b.examDate) return -1;
        return a.examDate.localeCompare(b.examDate);
      });
    }
    return Array.from(map.entries());
  }, [rows]);

  const nextExam = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return rows
      .filter((r) => !!r.examDate && r.examDate >= today)
      .sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0];
  }, [rows]);

  if (!selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Exams" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const subtitle = [selected.gradeName, selected.sectionName ? `Section ${selected.sectionName}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.flex}>
      <AppHeader title="Exams" subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={scheduleQuery.isFetching} onRefresh={() => scheduleQuery.refetch()} />}
      >
        {scheduleQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : rows.length === 0 ? (
          <Text style={styles.emptyText}>No exams scheduled yet.</Text>
        ) : (
          <>
            <View style={styles.banner}>
              <Text style={styles.bannerLabel}>EXAM SCHEDULE</Text>
              {nextExam ? (
                <Text style={styles.bannerText}>
                  Next up: {nextExam.subjectName} on {formatDate(nextExam.examDate!)}
                  {nextExam.startTime ? ` at ${formatTime(nextExam.startTime)}` : ''}
                </Text>
              ) : (
                <Text style={styles.bannerText}>All scheduled papers for this term are listed below.</Text>
              )}
            </View>

            {groups.map(([examName, examRows]) => (
              <View key={examName} style={styles.group}>
                <Text style={styles.groupTitle}>{examName.toUpperCase()}</Text>
                {examRows.map((row) => {
                  const tile = dayMonTile(row.examDate);
                  return (
                    <View key={row.examSubjectId} style={styles.examCard}>
                      <View style={styles.dateTile}>
                        <Text style={styles.dateDay}>{tile.day}</Text>
                        <Text style={styles.dateMon}>{tile.mon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName} numberOfLines={1}>{row.subjectName}</Text>
                        <Text style={styles.examMeta}>
                          {row.startTime ? formatTime(row.startTime) : 'Time TBA'} · {row.maxMarks} marks
                          {row.durationMinutes ? ` · ${row.durationMinutes} min` : ''}
                        </Text>
                      </View>
                      <Text style={styles.roomText}>{row.room ? `Room ${row.room}` : 'Room TBA'}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  banner: { backgroundColor: parentColors.pillBlueBg, borderRadius: 16, padding: 16, paddingHorizontal: 18 },
  bannerLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep, letterSpacing: 1.1 },
  bannerText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.bodyMuted, marginTop: 6 },
  group: { gap: 10 },
  groupTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.3,
    color: parentColors.muted,
    marginTop: 4,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateTile: { width: 52, alignItems: 'center' },
  dateDay: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  dateMon: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.mutedLight, letterSpacing: 0.8 },
  subjectName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  examMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  roomText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
});
