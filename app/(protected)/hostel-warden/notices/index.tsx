// Hostel Warden -> All notices. Pixel-matched to Warden App.dc.html's own
// `notices` screen: plain list, no actions (no compose control in the
// design, matching the read-only GET /announcements grant for this role).

import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { listWardenNotices } from '@/lib/hostel-warden-notices-api';
import { formatDate } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';

export default function WardenNoticesScreen() {
  const router = useRouter();
  const noticesQuery = useQuery({ queryKey: ['hostel-warden-notices'], queryFn: listWardenNotices });

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="All notices" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={noticesQuery.isFetching} onRefresh={() => noticesQuery.refetch()} />}
      >
        {noticesQuery.isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : noticesQuery.isError ? (
          <ErrorState message={noticesQuery.error instanceof ApiError ? noticesQuery.error.message : 'Unable to load notices.'} onRetry={() => noticesQuery.refetch()} />
        ) : (noticesQuery.data ?? []).length === 0 ? (
          <EmptyPanel label="No notices posted yet." />
        ) : (
          (noticesQuery.data ?? []).map((n) => (
            <Card key={n.id}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.meta}>{n.createdByName ?? 'School'} · {formatDate(n.createdAt)}</Text>
              <Text style={styles.body}>{n.body}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  meta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 4 },
  body: { fontSize: 13, color: hostelWardenColors.body, marginTop: 8, lineHeight: 19 },
});
