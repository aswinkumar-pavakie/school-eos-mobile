// Vice Principal -> Hostel detail (Phase 14) -- view-only, real backend data
// only. No create/edit/allocate-bed/vacate actions -- every write method on
// the 5 hostel controllers stays ADMIN-only, enforced server-side. Warden
// name resolved via getFaculty (Phase 6, already VP-authorized) -- no new
// lookup endpoint. Room/bed capacity computed via a real structural walk
// (blocks -> floors -> rooms); occupancy computed from the real
// hostel-allocations list filtered by this hostel's own name -- no per-bed
// fetch, no invented numbers.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getHostel, getHostelStructure, listAllocations } from '@/lib/vice-principal-hostel-api';
import { getFaculty } from '@/lib/vice-principal-faculty-api';

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

export default function VicePrincipalHostelDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const hostelQuery = useQuery({ queryKey: ['vp-hostel', 'hostel', id], queryFn: () => getHostel(id) });
  const structureQuery = useQuery({ queryKey: ['vp-hostel', 'structure', id], queryFn: () => getHostelStructure(id) });
  const allocationsQuery = useQuery({
    queryKey: ['vp-hostel', 'allocations', 'active'],
    queryFn: () => listAllocations({ status: 'ACTIVE' }),
  });
  const wardenQuery = useQuery({
    queryKey: ['vp-hostel', 'warden', hostelQuery.data?.wardenStaffId],
    queryFn: () => getFaculty(hostelQuery.data!.wardenStaffId!),
    enabled: !!hostelQuery.data?.wardenStaffId,
  });

  if (hostelQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Hostel" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (hostelQuery.isError || !hostelQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Hostel" onBack={() => router.back()} />
        <ErrorState
          message={hostelQuery.error instanceof ApiError ? hostelQuery.error.message : "Couldn't load this hostel."}
          onRetry={() => hostelQuery.refetch()}
        />
      </View>
    );
  }

  const hostel = hostelQuery.data;
  const structure = structureQuery.data;
  const residents = (allocationsQuery.data ?? []).filter((a) => a.hostelName === hostel.name);
  const totalBedCapacity = structure?.rooms.reduce((sum, r) => sum + r.bedCapacity, 0) ?? null;

  return (
    <View style={styles.flex}>
      <AppHeader title={hostel.name} subtitle={humanize(hostel.gender)} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>
            {wardenQuery.data ? `Warden: ${wardenQuery.data.firstName} ${wardenQuery.data.lastName ?? ''}` : 'No warden assigned'}
          </Text>
          <StatusBadge label={humanize(hostel.status)} tone={statusTone(hostel.status)} />
        </View>

        <Text style={styles.sectionTitle}>Occupancy</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{residents.length}</Text>
            <Text style={styles.statLabel}>Residents</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{hostel.capacity ?? totalBedCapacity ?? '—'}</Text>
            <Text style={styles.statLabel}>Capacity</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            {structureQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} />
            ) : (
              <Text style={styles.statValue}>{structure?.rooms.length ?? '—'}</Text>
            )}
            <Text style={styles.statLabel}>Rooms</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rooms</Text>
        {structureQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : structureQuery.isError ? (
          <ErrorState
            message={structureQuery.error instanceof ApiError ? structureQuery.error.message : 'Unable to load room structure.'}
            onRetry={() => structureQuery.refetch()}
          />
        ) : !structure || structure.rooms.length === 0 ? (
          <EmptyState message="No rooms on record for this hostel." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {structure.rooms.map((room, index) => (
              <View key={room.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoValue}>Room {room.roomNo}</Text>
                  <Text style={styles.infoLabel}>
                    {room.roomType ? `${room.roomType} · ` : ''}
                    {room.bedCapacity} beds
                  </Text>
                </View>
                <StatusBadge label={humanize(room.status)} tone={statusTone(room.status)} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Residents ({residents.length})</Text>
        {allocationsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : allocationsQuery.isError ? (
          <ErrorState
            message={allocationsQuery.error instanceof ApiError ? allocationsQuery.error.message : 'Unable to load residents.'}
            onRetry={() => allocationsQuery.refetch()}
          />
        ) : residents.length === 0 ? (
          <EmptyState message="No residents currently allocated to this hostel." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {residents.map((resident, index) => (
              <View key={resident.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {resident.studentFirstName} {resident.studentLastName ?? ''}
                  </Text>
                  <Text style={styles.infoLabel} numberOfLines={1}>
                    {resident.admissionNo} · Room {resident.roomNo}, Bed {resident.bedNo}
                  </Text>
                </View>
                <Text style={styles.dateText}>{formatDate(resident.allocatedFrom)}</Text>
              </View>
            ))}
          </View>
        )}
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
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  dateText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
});
