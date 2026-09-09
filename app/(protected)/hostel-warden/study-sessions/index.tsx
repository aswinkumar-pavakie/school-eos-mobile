import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { listStudySessions } from '@/lib/hostel-warden-api';
import { parentColors, cardShadow } from '@/lib/theme';

export default function StudySessionsScreen() {
  const router = useRouter();
  const sessionsQuery = useQuery({ queryKey: ['hostel-warden', 'study-sessions'], queryFn: listStudySessions });

  return (
    <View style={styles.flex}>
      <AppHeader title="Study Attendance" subtitle="Configured study sessions" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={sessionsQuery.isFetching} onRefresh={() => sessionsQuery.refetch()} />}
      >
        <Pressable style={styles.createButton} onPress={() => router.push('/(protected)/hostel-warden/study-sessions/create' as never)}>
          <Text style={styles.createButtonText}>+ New study session</Text>
        </Pressable>

        {sessionsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : sessionsQuery.isError ? (
          <ErrorState
            message={sessionsQuery.error instanceof ApiError ? sessionsQuery.error.message : 'Unable to load sessions.'}
            onRetry={() => sessionsQuery.refetch()}
          />
        ) : (sessionsQuery.data ?? []).length === 0 ? (
          <EmptyState message="No study sessions yet. Create one above." />
        ) : (
          (sessionsQuery.data ?? []).map((session) => (
            <Pressable
              key={session.id}
              style={[styles.card, cardShadow]}
              onPress={() => router.push(`/(protected)/hostel-warden/study-sessions/${session.id}` as never)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{formatDate(session.sessionDate)}</Text>
                <Text style={styles.cardMeta}>
                  {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
                </Text>
              </View>
              <StatusBadge label={session.isLocked ? 'Locked' : 'Open'} tone={session.isLocked ? 'neutral' : 'positive'} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  createButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  createButtonText: { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  cardMeta: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
});
