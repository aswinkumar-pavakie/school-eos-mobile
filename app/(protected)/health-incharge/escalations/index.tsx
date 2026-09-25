// Health In-charge -- every parent/doctor contact logged, across all
// students (GET /health-incharge/escalations, no studentId filter). Creating
// one always happens from the visit it's about (see visits/[id].tsx's own
// "Log a new contact" card, matching the backend's CreateEscalationDto which
// requires a visitId) -- this screen is browse-only, matching the website's
// own "Parent & doctor contacts" page.

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { HealthSubHeader, Card } from '@/components/health-incharge/primitives';
import { LoadingState, ErrorState, EmptyState } from '@/components/ScreenStates';
import { listHealthEscalations, studentName, CHANNEL_LABEL } from '@/lib/health-incharge-api';
import { formatDateTime } from '@/lib/format';
import { healthInchargeColors } from '@/lib/theme';

export default function EscalationsScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['health-incharge-escalations', undefined], queryFn: () => listHealthEscalations() });

  return (
    <View style={styles.flex}>
      <HealthSubHeader title="Parent & doctor contacts" onBack={() => router.back()} />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Couldn't load contacts." onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState message="No contacts logged yet." />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: e }) => (
            <Card style={styles.row} onPress={() => router.push(`/(protected)/health-incharge/students/${e.studentId}` as never)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{studentName(e)}</Text>
                <Text style={styles.sub}>
                  {e.contactedName ?? 'Contact'} · {e.channel ? CHANNEL_LABEL[e.channel] ?? e.channel : '—'} · {formatDateTime(e.contactedAt)}
                </Text>
                {e.response ? <Text style={styles.response} numberOfLines={2}>{e.response}</Text> : null}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  sub: { fontSize: 12, color: healthInchargeColors.muted, marginTop: 2 },
  response: { fontSize: 12.5, color: healthInchargeColors.body, marginTop: 4 },
});
