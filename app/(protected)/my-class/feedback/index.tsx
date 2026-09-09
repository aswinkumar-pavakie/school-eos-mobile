// Parent "Feedback" -- pixel-matched to the design reference's isFeedback block
// (per-subject teacher rating), wired to the real backend
// (school-eos-backend's parent-feedback.controller.ts). A Parent only ever sees
// and sets their OWN rating for their own child -- no comments/aggregation/class
// average view exists here, unlike the design reference's placeholder copy.
// submitFeedback depends on a database table (staff_feedback_response) the real
// deployment hasn't migrated yet, so it can 500 right now -- handled as a plain
// graceful error, same as any other transient failure, not a crash.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { listFeedbackSubjects, submitFeedback, type FeedbackSubject } from '@/lib/parent-api';
import { cardShadow, parentColors } from '@/lib/theme';

const STAR_PATH = 'M12 4l2.3 4.9 5.2.7-3.8 3.7.9 5.3L12 16l-4.6 2.6.9-5.3L4.5 9.6l5.2-.7z';

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function subjectCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (name.trim().slice(0, 2) || '--').toUpperCase();
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <Svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill={filled ? parentColors.blueDeep : 'none'}
      stroke={filled ? parentColors.blueDeep : parentColors.muted}
      strokeWidth={1.6}
    >
      <Path d={STAR_PATH} />
    </Svg>
  );
}

function SubjectCard({
  subject,
  saving,
  onRate,
}: {
  subject: FeedbackSubject;
  saving: boolean;
  onRate: (rating: number) => void;
}) {
  const rated = subject.myRating != null;
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.cardTop}>
        <View style={styles.subjectAvatar}>
          <Text style={styles.subjectAvatarText}>{subjectCode(subject.subjectName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName}>{subject.subjectName}</Text>
          <Text style={styles.teacherName}>{subject.teacherName ?? 'Teacher not assigned'}</Text>
        </View>
        {saving ? (
          <ActivityIndicator size="small" color={parentColors.blueDeep} />
        ) : (
          <Text style={[styles.stateText, { color: rated ? parentColors.blueDeep : parentColors.muted }]}>
            {rated ? `${subject.myRating}/5` : 'Not rated'}
          </Text>
        )}
      </View>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} hitSlop={4} disabled={saving} onPress={() => onRate(n)}>
            <StarIcon filled={subject.myRating != null && n <= subject.myRating} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function FeedbackScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selected, isLoading: childLoading } = useSelectedChild();
  const studentId = selected?.studentId;
  const [savingId, setSavingId] = useState<string | null>(null);

  const queryKey = ['feedback-subjects', studentId] as const;
  const subjectsQuery = useQuery({
    queryKey,
    queryFn: () => listFeedbackSubjects(studentId!),
    enabled: !!studentId,
  });

  async function handleRate(subjectOfferingId: string, rating: number) {
    if (!studentId || savingId) return;
    setSavingId(subjectOfferingId);
    try {
      const updated = await submitFeedback(studentId, subjectOfferingId, rating);
      queryClient.setQueryData(queryKey, updated);
    } catch (err) {
      Alert.alert('Could not save your rating', extractErrorMessage(err, 'Please try again.'));
    } finally {
      setSavingId(null);
    }
  }

  if (childLoading || !selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Feedback" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const subjects = subjectsQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Feedback" subtitle={selected.studentName} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={subjectsQuery.isFetching} onRefresh={() => subjectsQuery.refetch()} />}
      >
        {subjectsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : subjectsQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{extractErrorMessage(subjectsQuery.error, 'Feedback isn’t available right now.')}</Text>
            <Pressable style={styles.retryButton} onPress={() => subjectsQuery.refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>Rate each subject teacher. Your rating is private to you and can be updated anytime.</Text>
            {subjects.length === 0 ? (
              <View style={styles.noMatchCard}>
                <Text style={styles.noMatchTitle}>No subjects to rate yet</Text>
                <Text style={styles.noMatchSubtitle}>Subjects for this child will appear here once assigned.</Text>
              </View>
            ) : (
              subjects.map((s) => (
                <SubjectCard
                  key={s.subjectOfferingId}
                  subject={s}
                  saving={savingId === s.subjectOfferingId}
                  onRate={(rating) => handleRate(s.subjectOfferingId, rating)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  errorText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.redDark, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },

  intro: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.bodyMuted, lineHeight: 19 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 15, paddingHorizontal: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectAvatar: { width: 40, height: 40, borderRadius: 11, backgroundColor: parentColors.dueBg, alignItems: 'center', justifyContent: 'center' },
  subjectAvatarText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  subjectName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  teacherName: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  stateText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },

  starRow: { flexDirection: 'row', gap: 6, marginTop: 12 },

  noMatchCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  noMatchTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  noMatchSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 5, textAlign: 'center' },
});
