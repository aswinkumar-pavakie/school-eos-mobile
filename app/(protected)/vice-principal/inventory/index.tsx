// Vice Principal -> Inventory (Phase 15) -- school-level operational
// oversight, real backend data only (inventory-items/inventory-categories,
// now also authorized for VICE_PRINCIPAL -- see vice-principal-inventory-api.ts's
// own comment). Guarded by the parent vice-principal/_layout.tsx.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { getInventoryOverview, listInventoryCategories, listInventoryItems } from '@/lib/vice-principal-inventory-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const STATUS_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST', label: 'Lost' },
  { value: 'RETIRED', label: 'Retired' },
];

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

export default function VicePrincipalInventoryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  const overviewQuery = useQuery({ queryKey: ['vp-inventory', 'overview'], queryFn: getInventoryOverview });
  const categoriesQuery = useQuery({ queryKey: ['vp-inventory', 'categories'], queryFn: listInventoryCategories });
  const category = categoriesQuery.data?.find((c) => c.name === categoryName) ?? null;

  const itemsQuery = useQuery({
    queryKey: ['vp-inventory', 'items', search, location, status, category?.id],
    queryFn: () =>
      listInventoryItems({
        search: search.trim() || undefined,
        location: location.trim() || undefined,
        status: status ?? undefined,
        categoryId: category?.id,
      }),
  });

  const items = itemsQuery.data?.data ?? [];
  const total = itemsQuery.data?.meta.total ?? 0;
  const overview = overviewQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title="Inventory" subtitle="School-wide inventory overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {overviewQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginBottom: 12 }} />
        ) : overview ? (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.total}</Text>
                <Text style={styles.statLabel}>Total items</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.available}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.assigned}</Text>
                <Text style={styles.statLabel}>Assigned</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={[styles.statValue, overview.damaged > 0 && styles.statValueWarning]}>{overview.damaged}</Text>
                <Text style={styles.statLabel}>Damaged</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={[styles.statValue, overview.lost > 0 && styles.statValueWarning]}>{overview.lost}</Text>
                <Text style={styles.statLabel}>Lost</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={[styles.statValue, overview.lowStock > 0 && styles.statValueWarning]}>{overview.lowStock}</Text>
                <Text style={styles.statLabel}>Low stock</Text>
              </View>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Items</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or asset code…"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.searchInput}
        />
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Filter by location…"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.searchInput}
        />

        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setStatus(opt.value)}
              style={[styles.statusChip, status === opt.value && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, status === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginBottom: 8 }}>
          <SelectField
            label="Category"
            value={categoryName}
            placeholder={categoriesQuery.isLoading ? 'Loading…' : 'Any category'}
            options={(categoriesQuery.data ?? []).map((c) => c.name)}
            onSelect={setCategoryName}
            disabled={categoriesQuery.isLoading}
          />
        </View>

        {itemsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : itemsQuery.isError ? (
          <ErrorState
            message={itemsQuery.error instanceof ApiError ? itemsQuery.error.message : 'Unable to load inventory.'}
            onRetry={() => itemsQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState message="No items match your search or filters." />
        ) : (
          <>
            <Text style={styles.resultCount}>
              Showing {items.length} of {total}
              {total > items.length ? ' — refine your search to narrow further' : ''}
            </Text>
            <View style={styles.list}>
              {items.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/vice-principal/inventory/${item.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.categoryName}
                      {item.location ? ` · ${item.location}` : ''}
                      {item.quantity > 1 ? ` · Qty ${item.quantity}` : ''}
                    </Text>
                  </View>
                  <StatusBadge label={humanize(item.status)} tone={statusTone(item.status)} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statValueWarning: { color: '#B33A2E' },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  statusChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  statusChipTextActive: { color: '#fff' },
  resultCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 4, marginBottom: 8 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
