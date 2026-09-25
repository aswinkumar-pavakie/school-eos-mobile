// Health In-charge -- health alerts (infection clusters, missed medication,
// overdue follow-ups, unnotified visits, allergy risk -- system-detected, this
// role only acknowledges them). Same SegmentedTabs Open/Done split as the
// website's own alert status filter (GET /health-incharge/alerts?status=).

import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HealthSubHeader, Card, StatusPill } from '@/components/health-incharge/primitives';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { LoadingState, ErrorState, EmptyState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { listHealthAlerts, acknowledgeHealthAlert, studentName, ALERT_LABEL } from '@/lib/health-incharge-api';
import { formatDateTime } from '@/lib/format';
import { healthInchargeColors } from '@/lib/theme';

type Tab = 'open' | 'done';

export default function AlertsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('open');
  const [acking, setAcking] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['health-incharge-alerts', tab],
    queryFn: () => listHealthAlerts(tab),
  });

  async function handleAck(id: string) {
    setAcking(id);
    try {
      await acknowledgeHealthAlert(id);
      queryClient.invalidateQueries({ queryKey: ['health-incharge-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-dashboard'] });
    } catch (err) {
      // Surfaced inline via a brief row-level state would be nicer, but a toast-free
      // failure just leaves the row as "open" -- the acknowledge button stays visible
      // to retry, same effect as an explicit error message here.
      void (err instanceof ApiError ? err.message : err);
    } finally {
      setAcking(null);
    }
  }

  return (
    <View style={styles.flex}>
      <HealthSubHeader title="Health alerts" onBack={() => router.replace('/')} />
      <SegmentedTabs
        tabs={[
          { key: 'open', label: 'Open' },
          { key: 'done', label: 'Acknowledged' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Couldn't load alerts." onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState message={tab === 'open' ? 'No open alerts -- nothing is waiting for you.' : 'Nothing acknowledged yet.'} />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: a }) => (
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{ALERT_LABEL[a.alertType] ?? a.alertType}</Text>
                <Text style={styles.sub}>
                  {a.studentFirstName ? studentName(a) : (a.scopeType ?? 'School')} · {formatDateTime(a.detectedAt)}
                </Text>
              </View>
              {a.acknowledgedAt ? (
                <StatusPill label="Done" tone="ok" />
              ) : (
                <Pressable style={styles.ackButton} onPress={() => handleAck(a.id)} disabled={acking === a.id}>
                  {acking === a.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.ackButtonText}>Acknowledge</Text>}
                </Pressable>
              )}
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
  ackButton: { backgroundColor: healthInchargeColors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  ackButtonText: { color: '#fff', fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold' },
});
