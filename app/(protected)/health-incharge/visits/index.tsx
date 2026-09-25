// Health In-charge -- infirmary visit history. Same SegmentedTabs filter
// pattern as hostel-warden/complaints' own "Report an issue / History" split
// (shared, role-agnostic component), here splitting "All" from "Needs notice"
// -- mirrors the website's own /health-incharge/visits?notice=1 query-param
// filter (see health-incharge-api.ts's listHealthVisits({ needsParentNotice })).

import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { HealthSubHeader, Card, StatusPill } from '@/components/health-incharge/primitives';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { LoadingState, ErrorState, EmptyState } from '@/components/ScreenStates';
import { listHealthVisits, studentName, classLabel, ACTION_LABEL } from '@/lib/health-incharge-api';
import { formatDateTime } from '@/lib/format';
import { healthInchargeColors } from '@/lib/theme';

type Tab = 'all' | 'notice';

export default function VisitsScreen() {
  const router = useRouter();
  // Opened from Home's "Guardians to inform" tile with ?notice=1 -- same param
  // shape as the website's own /health-incharge/visits?notice=1 link -- so this
  // screen lands straight on the filtered tab instead of "All".
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const [tab, setTab] = useState<Tab>(notice === '1' ? 'notice' : 'all');

  const query = useQuery({
    queryKey: ['health-incharge-visits', tab],
    queryFn: () => listHealthVisits(tab === 'notice' ? { needsParentNotice: true } : {}),
  });

  return (
    <View style={styles.flex}>
      <HealthSubHeader title="Infirmary visits" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'all', label: 'All visits' },
          { key: 'notice', label: 'Needs notice' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Couldn't load visits." onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState message={tab === 'notice' ? 'Every serious visit has its guardians informed.' : 'No visits recorded yet.'} />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: v }) => (
            <Card style={styles.row} onPress={() => router.push(`/(protected)/health-incharge/visits/${v.id}` as never)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{studentName(v)}</Text>
                <Text style={styles.sub}>{classLabel(v.gradeName, v.sectionName)} · {formatDateTime(v.visitedAt)}</Text>
                <Text style={styles.complaint} numberOfLines={1}>{v.complaint}</Text>
              </View>
              <StatusPill label={ACTION_LABEL[v.action] ?? v.action} />
            </Card>
          )}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push('/(protected)/health-incharge/visits/create' as never)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  list: { padding: 16, paddingBottom: 90, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  sub: { fontSize: 12, color: healthInchargeColors.muted, marginTop: 2 },
  complaint: { fontSize: 12.5, color: healthInchargeColors.body, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: healthInchargeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: -2 },
});
