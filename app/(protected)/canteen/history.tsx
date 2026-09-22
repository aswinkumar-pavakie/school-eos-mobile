// Canteen counter's History screen -- every real charge ever made at this
// counter (canteen_transaction rows, written by the Ledger screen's own
// charge step), newest first. Read-only.

import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CanteenHeader } from '@/components/canteen/primitives';
import { parentColors } from '@/lib/theme';
import { formatMoneyDetail } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { listCanteenHistory } from '@/lib/canteen-api';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CanteenHistoryScreen() {
  const { data: entries = [], isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['canteen-history'],
    queryFn: () => listCanteenHistory(100),
  });

  return (
    <View style={styles.flex}>
      <CanteenHeader title="History" subtitle="Every canteen charge, newest first" />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {error instanceof ApiError ? error.message : 'Could not load canteen history.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={parentColors.blue} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No canteen charges yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.flexShrink}>
                <Text style={styles.name}>{item.studentName}</Text>
                <Text style={styles.meta}>
                  {item.admissionNo}
                  {item.gradeName ? ` · ${item.gradeName}${item.sectionName ? `-${item.sectionName}` : ''}` : ''}
                </Text>
                <Text style={styles.time}>{formatTimestamp(item.createdAt)}</Text>
              </View>
              <View style={styles.amounts}>
                <Text style={styles.amountNeg}>-{formatMoneyDetail(item.amountPaise)}</Text>
                <Text style={styles.balance}>Bal {formatMoneyDetail(item.balanceAfterPaise)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13.5, color: parentColors.muted },
  listContent: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: parentColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 14,
  },
  flexShrink: { flexShrink: 1 },
  name: { fontSize: 14.5, fontWeight: '700', color: parentColors.ink },
  meta: { fontSize: 12, color: parentColors.muted, marginTop: 1 },
  time: { fontSize: 11.5, color: parentColors.mutedLight, marginTop: 4 },
  amounts: { alignItems: 'flex-end' },
  amountNeg: { fontSize: 14.5, fontWeight: '800', color: '#C0392B' },
  balance: { fontSize: 12, color: parentColors.muted, marginTop: 3 },
});
