// READ ONLY -- no create/edit/allocate/transfer/vacate control anywhere on this
// screen or in hostel-warden-api.ts. Hostel structure and bed allocation stay
// Admin-web-only; this view only ever calls GET /hostel/room-allocations.
// Client-side search + filtering over the already-fetched list (no per-keystroke
// network call, and filters are derived from the same response rather than a
// second endpoint).

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { ApiError } from '@/lib/api';
import { listRoomAllocations } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

function unique(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

export default function RoomBedScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });

  const rows = useMemo(() => allocationsQuery.data ?? [], [allocationsQuery.data]);
  const blockOptions = useMemo(() => unique(rows.map((r) => r.blockName)), [rows]);
  const floorOptions = useMemo(() => unique(rows.map((r) => (r.floorNo != null ? `Floor ${r.floorNo}` : null))), [rows]);
  const gradeOptions = useMemo(() => unique(rows.map((r) => r.gradeName)), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (blockFilter && row.blockName !== blockFilter) return false;
      if (floorFilter && `Floor ${row.floorNo}` !== floorFilter) return false;
      if (gradeFilter && row.gradeName !== gradeFilter) return false;
      if (!q) return true;
      return (
        fullName(row.studentFirstName, row.studentLastName).toLowerCase().includes(q) ||
        row.admissionNo.toLowerCase().includes(q) ||
        row.roomNo.toLowerCase().includes(q)
      );
    });
  }, [rows, search, blockFilter, floorFilter, gradeFilter]);

  return (
    <View style={styles.flex}>
      <AppHeader title="Students" subtitle="Read-only allocation view" onBack={() => router.back()} />
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, admission no. or room"
          placeholderTextColor={parentColors.mutedLight}
        />
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <SelectField label="Block" value={blockFilter} placeholder="All blocks" options={blockOptions} onSelect={(v) => setBlockFilter(v === blockFilter ? null : v)} />
          </View>
          <View style={styles.filterField}>
            <SelectField label="Floor" value={floorFilter} placeholder="All floors" options={floorOptions} onSelect={(v) => setFloorFilter(v === floorFilter ? null : v)} />
          </View>
          <View style={styles.filterField}>
            <SelectField label="Class" value={gradeFilter} placeholder="All classes" options={gradeOptions} onSelect={(v) => setGradeFilter(v === gradeFilter ? null : v)} />
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={allocationsQuery.isFetching} onRefresh={() => allocationsQuery.refetch()} />}
      >
        {allocationsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : allocationsQuery.isError ? (
          <ErrorState
            message={allocationsQuery.error instanceof ApiError ? allocationsQuery.error.message : 'Unable to load allocations.'}
            onRetry={() => allocationsQuery.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState message={search || blockFilter || floorFilter || gradeFilter ? 'No matching student.' : 'No students currently allocated.'} />
        ) : (
          filtered.map((row) => (
            <Pressable
              key={row.id}
              style={[styles.card, cardShadow]}
              onPress={() => router.push(`/(protected)/hostel-warden/room-bed/${row.studentId}` as never)}
            >
              <Avatar firstName={row.studentFirstName} lastName={row.studentLastName} photoUrl={row.photoUrl} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {fullName(row.studentFirstName, row.studentLastName)}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {row.admissionNo}
                  {row.gradeName ? ` · ${row.gradeName}${row.sectionName ? ` ${row.sectionName}` : ''}` : ''}
                </Text>
                <Text style={styles.roomBed}>
                  {row.blockName} · Room {row.roomNo} · Bed {row.bedNo}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  roomBed: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep, marginTop: 6 },
  chevron: { fontSize: 26, color: parentColors.mutedLight, fontFamily: 'PlusJakartaSans_400Regular' },
});
