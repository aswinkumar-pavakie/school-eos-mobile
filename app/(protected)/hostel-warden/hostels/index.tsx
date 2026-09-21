// Hostel Warden -> Hostel details. Pixel-matched to Warden App.dc.html's
// own `hostels` screen (block-level directory), same shape as the website's
// own Hostel Details page (aggregate stat row + per-block register) for
// cross-platform consistency. Real, already warden-scoped data only:
// listHostelStructure() (blocks/rooms + real bedCapacity) +
// listRoomAllocations() (occupancy), the same two endpoints Room Details/
// Complaints already use -- no new backend needed. The design's own mock
// HOSTELS record also carries `wing`/`warden`/`mess` fields with no real
// per-block equivalent in this schema (confirmed by backend audit:
// hostel_block has no such columns) -- those are left out rather than
// fabricated.

import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { listHostelStructure, listRoomAllocations, listWardenRoster } from '@/lib/hostel-warden-api';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';

export default function HostelsScreen() {
  const router = useRouter();
  const structureQuery = useQuery({ queryKey: ['hostel-warden', 'blocks'], queryFn: listHostelStructure });
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });
  // A block belongs to exactly one hostel; the warden roster is scoped by
  // hostel, not block, so every block under the same hostel shares the same
  // warden name(s) here -- real, just not block-granular (matches the
  // website's own hostels/rooms pages, which do the same thing).
  const rosterQuery = useQuery({ queryKey: ['hostel-warden', 'warden-roster'], queryFn: () => listWardenRoster().catch(() => []) });

  const isLoading = structureQuery.isLoading || allocationsQuery.isLoading;
  const hasError = structureQuery.isError || allocationsQuery.isError;
  const isFetching = structureQuery.isFetching || allocationsQuery.isFetching;

  const wardenNames = (rosterQuery.data ?? []).map((w) => [w.firstName, w.lastName].filter(Boolean).join(' ')).join(', ') || 'Not assigned';

  const occupiedByRoom = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of allocationsQuery.data ?? []) map.set(row.roomId, (map.get(row.roomId) ?? 0) + 1);
    return map;
  }, [allocationsQuery.data]);

  const blocks = useMemo(
    () =>
      (structureQuery.data ?? []).map((b) => {
        const capacity = b.rooms.reduce((sum, r) => sum + (r.bedCapacity || 0), 0);
        const occupied = b.rooms.reduce((sum, r) => sum + (occupiedByRoom.get(r.id) ?? 0), 0);
        return { ...b, capacity, occupied };
      }),
    [structureQuery.data, occupiedByRoom],
  );

  const totals = useMemo(
    () => ({
      rooms: blocks.reduce((sum, b) => sum + b.rooms.length, 0),
      capacity: blocks.reduce((sum, b) => sum + b.capacity, 0),
      occupied: blocks.reduce((sum, b) => sum + b.occupied, 0),
    }),
    [blocks],
  );

  function refetchAll() {
    structureQuery.refetch();
    allocationsQuery.refetch();
  }

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Hostel details" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetchAll} />}
      >
        {isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState message={structureQuery.error instanceof ApiError ? structureQuery.error.message : 'Unable to load hostel details.'} onRetry={refetchAll} />
        ) : blocks.length === 0 ? (
          <EmptyPanel label="No hostel blocks are assigned to you." />
        ) : (
          <>
            <View style={styles.statGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Blocks</Text>
                <Text style={styles.statValue}>{blocks.length}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Rooms</Text>
                <Text style={styles.statValue}>{totals.rooms}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Beds occupied</Text>
                <Text style={styles.statValue}>{totals.occupied} / {totals.capacity}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Beds vacant</Text>
                <Text style={styles.statValue}>{Math.max(0, totals.capacity - totals.occupied)}</Text>
              </View>
            </View>

            {blocks.map((b) => (
              <Card
                key={b.id}
                onPress={() => router.push('/(protected)/hostel-warden/room-details' as never)}
              >
                <Text style={styles.blockName}>{b.name}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaTile}>
                    <Text style={styles.metaValue}>{b.rooms.length}</Text>
                    <Text style={styles.metaLabel}>Rooms</Text>
                  </View>
                  <View style={styles.metaTile}>
                    <Text style={styles.metaValue}>{b.occupied} / {b.capacity}</Text>
                    <Text style={styles.metaLabel}>Occupied</Text>
                  </View>
                  <View style={styles.metaTile}>
                    <Text style={styles.metaValue}>{Math.max(0, b.capacity - b.occupied)}</Text>
                    <Text style={styles.metaLabel}>Vacant</Text>
                  </View>
                </View>
                <View style={styles.wardenRow}>
                  <Text style={styles.wardenLabel}>Warden in charge</Text>
                  <Text style={styles.wardenValue}>{wardenNames}</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statTile: { flexBasis: '47%', flexGrow: 1, backgroundColor: hostelWardenColors.tint, borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 11.5, color: hostelWardenColors.body, fontFamily: 'PlusJakartaSans_600SemiBold' },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.primaryDark, marginTop: 4 },
  blockName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metaTile: { flex: 1, backgroundColor: hostelWardenColors.tint, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  metaValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.primaryDark },
  metaLabel: { fontSize: 11, color: hostelWardenColors.body, marginTop: 2 },
  wardenRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: hostelWardenColors.tint },
  wardenLabel: { fontSize: 12, color: hostelWardenColors.body, fontFamily: 'PlusJakartaSans_600SemiBold' },
  wardenValue: { fontSize: 12.5, color: hostelWardenColors.ink, fontFamily: 'PlusJakartaSans_700Bold', flexShrink: 1, textAlign: 'right', marginLeft: 10 },
});
