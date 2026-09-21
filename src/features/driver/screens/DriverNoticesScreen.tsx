// Driver -> All notices. Same read-only pattern as Hostel Warden's own
// WardenNoticesScreen -- plain list, no compose control (no create
// authority granted to DRIVER on POST /announcements, only the GET list was
// widened). Reuses listAnnouncements({ roleCode: 'DRIVER' }) -- the same
// shared school-announcements backend every other role's Notices screen
// already uses (see announcements.controller.ts's own @Roles history).

import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { listAnnouncements } from '@/lib/vice-principal-dashboard-api';
import { parentColors, cardShadow } from '@/lib/theme';

export function DriverNoticesScreen() {
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }

  const noticesQuery = useQuery({
    queryKey: ['driver', 'notices'],
    queryFn: () => listAnnouncements({ roleCode: 'DRIVER' }),
  });
  const notices = noticesQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <GradientHeader title="Notices" onBack={goBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={noticesQuery.isFetching} onRefresh={() => noticesQuery.refetch()} />}
      >
        {noticesQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : noticesQuery.isError ? (
          <ErrorState
            message={noticesQuery.error instanceof ApiError ? noticesQuery.error.message : 'Unable to load notices.'}
            onRetry={() => noticesQuery.refetch()}
          />
        ) : notices.length === 0 ? (
          <EmptyState message="No notices posted yet." />
        ) : (
          notices.map((n) => (
            <View key={n.id} style={[styles.card, cardShadow]}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.meta}>
                {n.category ? `${n.category} · ` : ''}
                {formatDate(n.createdAt)}
              </Text>
              <Text style={styles.body}>{n.body}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  meta: { fontSize: 12, color: parentColors.muted, marginTop: 4 },
  body: { fontSize: 13, color: parentColors.bodyMuted, marginTop: 8, lineHeight: 19 },
});
