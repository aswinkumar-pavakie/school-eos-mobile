// Current Term (LMS) -- top-level subject folders. One entry per (faculty,
// subject) pair regardless of how many classes/sections that subject is
// taught to -- derived live from real subject_offering rows, grouped
// server-side. Never one folder per class, per the explicit scoping rule.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ChevronRightIcon } from '@/components/faculty/icons';
import { listLmsSubjects } from '@/lib/faculty-lms-api';
import { facultyColors, cardShadow } from '@/lib/theme';

export default function LmsSubjectsScreen() {
  const router = useRouter();
  const listQuery = useQuery({ queryKey: ['faculty-lms-subjects'], queryFn: listLmsSubjects });
  const subjects = listQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Current Term" subtitle="Materials, tasks & lesson plans" onBack={() => router.replace('/academics' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        {listQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : subjects.length === 0 ? (
          <Text style={styles.emptyText}>You are not assigned to teach any subject yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {subjects.map((s) => (
              <Pressable
                key={s.subjectId}
                style={[styles.card, cardShadow]}
                onPress={() => router.push(`/faculty/lms/${s.subjectId}` as never)}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle}>{s.subjectName}</Text>
                  <Text style={styles.cardMeta} numberOfLines={2}>
                    {s.classes.map((c) => `${c.gradeName} ${c.sectionName}`).join(' · ')}
                  </Text>
                </View>
                <ChevronRightIcon color={facultyColors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 15 },
  cardTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 4 },
});
