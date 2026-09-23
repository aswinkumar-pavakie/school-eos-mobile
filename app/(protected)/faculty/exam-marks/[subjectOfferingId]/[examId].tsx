// Student-wise marks for one finished exam × subject -- reached by tapping
// a "Finished" row in the Exams screen (either Faculty's own subject or a
// Class Teacher's whole section, any subject). Real backend call only,
// already scoped server-side (owns the offering OR is the section's class
// advisor -- see FacultyExamScheduleService.getMarksForExamSubject).

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { getMarksForExamSubject } from '@/lib/faculty-exams-api';
import { initialsOf } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

export default function ExamSubjectMarksScreen() {
  const router = useRouter();
  const { subjectOfferingId, examId } = useLocalSearchParams<{ subjectOfferingId: string; examId: string }>();
  const query = useQuery({
    queryKey: ['faculty-exam-subject-marks', subjectOfferingId, examId],
    queryFn: () => getMarksForExamSubject(subjectOfferingId, examId),
    enabled: !!subjectOfferingId && !!examId,
  });

  const students = query.data?.students ?? [];
  const scored = students.filter((s) => s.marksObtained !== null && s.maxMarks !== null);
  const avg = scored.length > 0 ? Math.round((scored.reduce((sum, s) => sum + (s.marksObtained! / s.maxMarks!) * 100, 0) / scored.length)) : null;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Marks" subtitle={avg !== null ? `Class average ${avg}%` : 'No marks entered yet'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : students.length === 0 ? (
          <Text style={styles.emptyText}>No students found.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {students.map((s) => {
              const [first = '', ...rest] = s.studentName.split(' ');
              const percent = s.marksObtained !== null && s.maxMarks ? Math.round((s.marksObtained / s.maxMarks) * 100) : null;
              return (
                <View key={s.studentId} style={styles.row}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initialsOf(first, rest.join(' '))}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{s.studentName}</Text>
                    <Text style={styles.meta}>Roll {s.rollNo ?? '—'}</Text>
                  </View>
                  {s.isAbsent ? (
                    <Text style={styles.absent}>Absent</Text>
                  ) : s.marksObtained !== null ? (
                    <Text style={styles.marks}>{s.marksObtained}/{s.maxMarks} {percent !== null ? `(${percent}%)` : ''}</Text>
                  ) : (
                    <Text style={styles.pending}>Not entered</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  name: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  meta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  marks: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  pending: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
  absent: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.redDark },
});
