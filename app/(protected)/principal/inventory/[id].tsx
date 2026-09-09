// Principal -> Inventory item detail -- view-only, real
// backend data only. No add-stock/adjust-stock/issue/return/transfer/mark-
// damaged/mark-lost/retire actions -- inventory-items.controller.ts only
// grants PRINCIPAL list/overview/get (identical to VICE_PRINCIPAL's own
// grant); every write method stays ADMIN-only, enforced server-side.
// acquisitionCostPaise and vendor are deliberately never rendered
// (procurement/financial data, out of scope).
// No Maintenance/repair-request cross-reference -- explicitly out of this
// phase's own scope, see the api file's own comment.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getInventoryItem } from '@/lib/principal-inventory-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function statusTone(status: string): StatusTone {
  if (status === 'AVAILABLE') return 'positive';
  if (['DAMAGED', 'LOST'].includes(status)) return 'negative';
  if (status === 'ASSIGNED') return 'warning';
  return 'neutral';
}

export default function PrincipalInventoryItemDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const itemQuery = useQuery({ queryKey: ['principal-inventory', 'item', id], queryFn: () => getInventoryItem(id) });

  if (itemQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Item" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Item" onBack={() => router.back()} />
        <ErrorState
          message={itemQuery.error instanceof ApiError ? itemQuery.error.message : "Couldn't load this item."}
          onRetry={() => itemQuery.refetch()}
        />
      </View>
    );
  }

  const item = itemQuery.data;
  const meta = { label: humanize(item.status), tone: statusTone(item.status) };
  const isLowStock = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;

  return (
    <View style={styles.flex}>
      <AppHeader title={item.name} subtitle={item.categoryName} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>
            Qty {item.quantity}
            {isLowStock ? ' · Low stock' : ''}
          </Text>
          <StatusBadge {...meta} />
        </View>

        <Text style={styles.sectionTitle}>Item information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Asset code</Text>
            <Text style={styles.infoValue}>{item.assetCode ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoValue}>{item.categoryName}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{item.location ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Acquired on</Text>
            <Text style={styles.infoValue}>{item.acquisitionDate ? formatDate(item.acquisitionDate) : '—'}</Text>
          </View>
        </View>

        {item.description ? (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.body}>{item.description}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Assignment</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned to</Text>
            <Text style={styles.infoValue}>{item.assignedToName ?? 'Not assigned'}</Text>
          </View>
          {item.assignedOn ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Assigned on</Text>
              <Text style={styles.infoValue}>{formatDate(item.assignedOn)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 20 },
});
