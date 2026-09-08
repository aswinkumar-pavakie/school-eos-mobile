// Current term -- real subject list from parent-academic.controller.ts's own
// /term route (CurrentTermSubject[]), tapping a subject pushes to its detail
// screen. Pixel reference: "School App.dc.html" isTerm block (lines 781-803).

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { listCurrentTerm, type CurrentTermSubject } from '@/lib/parent-api';
import { parentColors } from '@/lib/theme';

function ChevronRight() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={parentColors.muted} strokeWidth={2.2}>
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

function subjectCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (words[0] ?? '').slice(0, 2).toUpperCase();
}

export default function CurrentTermScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;
  const subtitle = selected ? [selected.gradeName, selected.sectionName].filter(Boolean).join(' · ') : undefined;

  const termQuery = useQuery({
    queryKey: ['current-term', studentId],
    queryFn: () => listCurrentTerm(studentId!),
    enabled: !!studentId,
  });

  const subjects = termQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Current term" subtitle={subtitle} onBack={() => router.back()} />
      {!selected || termQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={styles.spinner} />
      ) : subjects.length === 0 ? (
        <Text style={styles.emptyText}>No subjects found for this term.</Text>
      ) : (
        <View style={styles.list}>
          {subjects.map((s) => (
            <SubjectCard
              key={s.subjectOfferingId}
              subject={s}
              onPress={() => router.push(`/academics/current-term/${s.subjectOfferingId}` as never)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function SubjectCard({ subject, onPress }: { subject: CurrentTermSubject; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{subjectCode(subject.subjectName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName}>{subject.subjectName}</Text>
          <Text style={styles.teacherName}>{subject.teacherName ?? 'No teacher assigned'}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.metaText}>
          {subject.weeklyPeriods != null
            ? `${subject.weeklyPeriods} period${subject.weeklyPeriods === 1 ? '' : 's'} a week`
            : 'Schedule not set'}
        </Text>
        <ChevronRight />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  spinner: { marginTop: 24 },
  list: { padding: 16, paddingTop: 14, gap: 12, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 15 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: parentColors.dueBg, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  subjectName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  teacherName: { fontSize: 12.5, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  metaText: { fontSize: 12.5, color: parentColors.bodyMuted, fontFamily: 'PlusJakartaSans_700Bold' },
});
