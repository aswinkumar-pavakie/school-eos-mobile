// READ ONLY -- every room in the Warden's hostel (from GET /hostel/blocks, the
// same real block/room structure the Complaints form's picker already uses), not
// just occupied ones, with student occupants cross-referenced from
// GET /hostel/room-allocations by the real roomId (not room number text, which can
// repeat across blocks). Tapping a room opens a popup listing its occupants +
// class -- no allocate/transfer/edit control anywhere here, same as the Students
// list this complements.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { ApiError } from '@/lib/api';
import { listHostelStructure, listRoomAllocations, type HostelAllocationRow } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

interface FlatRoom {
  id: string;
  roomNo: string;
  floorNo: number;
  blockName: string;
}

export default function RoomDetailsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<FlatRoom | null>(null);

  const structureQuery = useQuery({ queryKey: ['hostel-warden', 'blocks'], queryFn: listHostelStructure });
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });

  const rooms = useMemo<FlatRoom[]>(() => {
    const blocks = structureQuery.data ?? [];
    const flat: FlatRoom[] = [];
    for (const block of blocks) {
      for (const room of block.rooms) {
        flat.push({ id: room.id, roomNo: room.roomNo, floorNo: room.floorNo, blockName: block.name });
      }
    }
    return flat;
  }, [structureQuery.data]);

  const occupantsByRoomId = useMemo(() => {
    const map = new Map<string, HostelAllocationRow[]>();
    for (const row of allocationsQuery.data ?? []) {
      const existing = map.get(row.roomId);
      if (existing) existing.push(row);
      else map.set(row.roomId, [row]);
    }
    return map;
  }, [allocationsQuery.data]);

  const blockOptions = useMemo(() => Array.from(new Set(rooms.map((r) => r.blockName))).sort(), [rooms]);
  const floorOptions = useMemo(() => Array.from(new Set(rooms.map((r) => `Floor ${r.floorNo}`))).sort(), [rooms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((room) => {
      if (blockFilter && room.blockName !== blockFilter) return false;
      if (floorFilter && `Floor ${room.floorNo}` !== floorFilter) return false;
      if (q && !room.roomNo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rooms, search, blockFilter, floorFilter]);

  const isLoading = structureQuery.isLoading || allocationsQuery.isLoading;
  const isFetching = structureQuery.isFetching || allocationsQuery.isFetching;
  const hasError = structureQuery.isError || allocationsQuery.isError;

  function refetchAll() {
    structureQuery.refetch();
    allocationsQuery.refetch();
  }

  const selectedOccupants = selectedRoom ? (occupantsByRoomId.get(selectedRoom.id) ?? []) : [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Room Details" subtitle="Every room in your hostel" onBack={() => router.back()} />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by room number"
          placeholderTextColor={parentColors.mutedLight}
        />
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <SelectField label="Block" value={blockFilter} placeholder="All blocks" options={blockOptions} onSelect={(v) => setBlockFilter(v === blockFilter ? null : v)} />
          </View>
          <View style={styles.filterField}>
            <SelectField label="Floor" value={floorFilter} placeholder="All floors" options={floorOptions} onSelect={(v) => setFloorFilter(v === floorFilter ? null : v)} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetchAll} />}
      >
        {isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState
            message={structureQuery.error instanceof ApiError ? structureQuery.error.message : 'Unable to load rooms.'}
            onRetry={refetchAll}
          />
        ) : filtered.length === 0 ? (
          <EmptyState message={search || blockFilter || floorFilter ? 'No matching room.' : 'No rooms found.'} />
        ) : (
          filtered.map((room) => {
            const occupants = occupantsByRoomId.get(room.id) ?? [];
            return (
              <Pressable key={room.id} style={[styles.card, cardShadow]} onPress={() => setSelectedRoom(room)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomTitle}>
                    {room.blockName} · Room {room.roomNo}
                  </Text>
                  <Text style={styles.meta}>Floor {room.floorNo}</Text>
                </View>
                <Text style={styles.occupantCount}>
                  {occupants.length} student{occupants.length === 1 ? '' : 's'}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!selectedRoom} transparent animationType="fade" onRequestClose={() => setSelectedRoom(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectedRoom ? `${selectedRoom.blockName} · Room ${selectedRoom.roomNo}` : ''}
            </Text>
            <Text style={styles.modalSubtitle}>{selectedRoom ? `Floor ${selectedRoom.floorNo}` : ''}</Text>

            {selectedOccupants.length === 0 ? (
              <Text style={styles.noOccupants}>No students currently allocated to this room.</Text>
            ) : (
              <ScrollView style={styles.modalList}>
                {selectedOccupants.map((occupant) => (
                  <View key={occupant.studentId} style={styles.occupantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.occupantName}>{fullName(occupant.studentFirstName, occupant.studentLastName)}</Text>
                      <Text style={styles.occupantMeta}>
                        {occupant.gradeName ? `${occupant.gradeName}${occupant.sectionName ? ` · ${occupant.sectionName}` : ''}` : 'Not enrolled this year'}
                      </Text>
                    </View>
                    <Text style={styles.occupantBed}>Bed {occupant.bedNo}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <Pressable style={styles.closeButton} onPress={() => setSelectedRoom(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    backgroundColor: '#fff',
  },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterField: { flex: 1 },
  content: { padding: 16, paddingTop: 12, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  roomTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  occupantCount: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  chevron: { fontSize: 24, color: parentColors.mutedLight, fontFamily: 'PlusJakartaSans_400Regular' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,27,51,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxHeight: '75%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  modalSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2, marginBottom: 14 },
  modalList: { marginBottom: 4 },
  noOccupants: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, paddingVertical: 12 },
  occupantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  occupantName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  occupantMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  occupantBed: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  closeButton: { marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: parentColors.blue },
  closeButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5 },
});
