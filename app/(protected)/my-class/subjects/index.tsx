// Pixel replica of the design reference's isSubjects block -- one card per
// subject with a real syllabus-progress bar. Real GET /parent/students/:id/subjects.

import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { listSubjects, type ParentSubject } from '@/lib/parent-api';
import { parentColors, cardShadow } from '@/lib/theme';

function subjectCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export default function SubjectsScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;

  const subjectsQuery = useQuery({
    queryKey: ['subjects', studentId],
    queryFn: () => listSubjects(studentId!),
    enabled: !!studentId,
  });

  if (!selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Subjects" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const subjects = subjectsQuery.data ?? [];
  const subtitle = [selected.gradeName, selected.sectionName ? `Section ${selected.sectionName}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.flex}>
      <AppHeader title="Subjects" subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={subjectsQuery.isFetching} onRefresh={() => subjectsQuery.refetch()} />}
      >
        {subjectsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : subjects.length === 0 ? (
          <Text style={styles.emptyText}>No subjects assigned yet.</Text>
        ) : (
          subjects.map((s) => <SubjectCard key={s.subjectOfferingId} subject={s} />)
        )}
      </ScrollView>
    </View>
  );
}

function SubjectCard({ subject }: { subject: ParentSubject }) {
  const percent = Math.max(0, Math.min(100, subject.syllabusProgressPercent));
  const metaParts = [
    subject.teacherName,
    subject.weeklyPeriods != null ? `${subject.weeklyPeriods} periods/week` : null,
  ].filter(Boolean);
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>{subjectCode(subject.subjectName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName} numberOfLines={1}>{subject.subjectName}</Text>
          <Text style={styles.subjectMeta} numberOfLines={1}>
            {metaParts.length ? metaParts.join(' · ') : 'Teacher not assigned'}
          </Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{percent}% syllabus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 15, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: parentColors.dueBg, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  subjectName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  subjectMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  progressTrack: { flex: 1, height: 8, borderRadius: 99, backgroundColor: parentColors.borderSoft, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: parentColors.blue, borderRadius: 99 },
  progressLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
});
