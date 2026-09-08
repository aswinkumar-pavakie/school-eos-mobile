// Vice Principal -> Examination Timetable detail (Phase 10) -- read-only,
// real backend data only. No create/edit/publish/room-assignment actions --
// exams.controller.ts only grants VICE_PRINCIPAL the read methods this
// screen calls; every write method stays ADMIN-only, enforced server-side.
// Schedule grouped by real exam date, sorted by date then start time --
// deliberately shows scheduling fields only (date/time/room/subject/class/
// teacher), never the marks/practical fields the same rows also carry
// (Examinations module, explicitly out of this phase's scope).

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getExamSchedules, getExamination, type ExamScheduleRow } from '@/lib/vice-principal-exam-timetable-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function groupByDate(rows: ExamScheduleRow[]): { date: string; rows: ExamScheduleRow[] }[] {
  const map = new Map<string, ExamScheduleRow[]>();
  for (const row of rows) {
    const list = map.get(row.examDate) ?? [];
    list.push(row);
    map.set(row.examDate, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, groupRows]) => ({
      date,
      rows: groupRows.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
}

export default function VicePrincipalExamTimetableDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const examQuery = useQuery({ queryKey: ['vp-exam-timetable', 'exam', id], queryFn: () => getExamination(id) });
  const schedulesQuery = useQuery({ queryKey: ['vp-exam-timetable', 'schedules', id], queryFn: () => getExamSchedules(id) });

  if (examQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Examination" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (examQuery.isError || !examQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Examination" onBack={() => router.back()} />
        <ErrorState
          message={examQuery.error instanceof ApiError ? examQuery.error.message : "Couldn't load this examination."}
          onRetry={() => examQuery.refetch()}
        />
      </View>
    );
  }

  const exam = examQuery.data;
  const groups = groupByDate(schedulesQuery.data ?? []);

  return (
    <View style={styles.flex}>
      <AppHeader title={exam.name} subtitle={exam.academicYearName} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {schedulesQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : schedulesQuery.isError ? (
          <ErrorState
            message={schedulesQuery.error instanceof ApiError ? schedulesQuery.error.message : 'Unable to load the schedule.'}
            onRetry={() => schedulesQuery.refetch()}
          />
        ) : groups.length === 0 ? (
          <EmptyState message="No schedule has been set for this examination yet." />
        ) : (
          groups.map((group) => (
            <View key={group.date} style={{ marginBottom: 18 }}>
              <Text style={styles.dateHeading}>{formatDate(group.date)}</Text>
              <View style={[styles.list, cardShadow]}>
                {group.rows.map((row, index) => (
                  <View key={row.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeText}>{row.startTime.slice(0, 5)}</Text>
                      <Text style={styles.durationText}>{row.durationMinutes} min</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.subjectText} numberOfLines={1}>
                        {row.subjectName}
                      </Text>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {row.gradeName} {row.sectionName}
                        {row.room ? ` · Room ${row.room}` : ''}
                      </Text>
                      {row.teacherFirstName ? (
                        <Text style={styles.metaText} numberOfLines={1}>
                          {row.teacherFirstName} {row.teacherLastName ?? ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  dateHeading: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, marginBottom: 8 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  timeCol: { width: 66 },
  timeText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  durationText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  subjectText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  metaText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
