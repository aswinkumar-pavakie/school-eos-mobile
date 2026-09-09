// Principal -> Hostel -- school-level operational oversight,
// real backend data only. All 5 hostel controllers already authorized for
// PRINCIPAL, identical to VICE_PRINCIPAL's own grant -- see
// principal-hostel-api.ts's own comment. Guarded by the parent
// principal/_layout.tsx.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { listAllocations, listHostels } from '@/lib/principal-hostel-api';

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
  if (status === 'ACTIVE') return 'positive';
  if (['INACTIVE', 'CLOSED'].includes(status)) return 'negative';
  return 'warning';
}

export default function PrincipalHostelScreen() {
  const router = useRouter();

  const hostelsQuery = useQuery({ queryKey: ['principal-hostel', 'hostels'], queryFn: listHostels });
  const allocationsQuery = useQuery({
    queryKey: ['principal-hostel', 'allocations', 'active'],
    queryFn: () => listAllocations({ status: 'ACTIVE' }),
  });

  const hostels = hostelsQuery.data ?? [];
  const activeHostels = hostels.filter((h) => h.status === 'ACTIVE');
  const totalCapacity = hostels.reduce((sum, h) => sum + (h.capacity ?? 0), 0);
  const totalOccupied = allocationsQuery.data?.length ?? 0;

  return (
    <View style={styles.flex}>
      <AppHeader title="Hostel" subtitle="School-wide hostel overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{activeHostels.length}</Text>
            <Text style={styles.statLabel}>Active hostels</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            {allocationsQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} />
            ) : (
              <Text style={styles.statValue}>{totalOccupied}</Text>
            )}
            <Text style={styles.statLabel}>Residents</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{totalCapacity || '—'}</Text>
            <Text style={styles.statLabel}>Total capacity</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Hostels</Text>
        {hostelsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 12 }} />
        ) : hostelsQuery.isError ? (
          <ErrorState
            message={hostelsQuery.error instanceof ApiError ? hostelsQuery.error.message : 'Unable to load hostels.'}
            onRetry={() => hostelsQuery.refetch()}
          />
        ) : hostels.length === 0 ? (
          <EmptyState message="No hostels on record." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {hostels.map((hostel, index) => {
              const occupied = (allocationsQuery.data ?? []).filter((a) => a.hostelName === hostel.name).length;
              return (
                <Pressable
                  key={hostel.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/principal/hostel/${hostel.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {hostel.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {humanize(hostel.gender)}
                      {hostel.capacity != null ? ` · ${occupied}/${hostel.capacity} occupied` : ''}
                    </Text>
                  </View>
                  <StatusBadge label={humanize(hostel.status)} tone={statusTone(hostel.status)} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
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
