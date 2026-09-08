// Vice Principal -> Parents (Phase 5) -- an oversight/information list, real
// backend search+filter only (parents.controller.ts's own /parents, now also
// authorized for VICE_PRINCIPAL -- see that controller's comment). Guarded
// by the parent vice-principal/_layout.tsx (covers this whole subtree, no
// separate role check needed here).

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { initialsOf } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listParents } from '@/lib/vice-principal-parents-api';

const STATUS_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function statusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', tone: 'positive' };
    case 'SUSPENDED':
      return { label: 'Suspended', tone: 'warning' };
    default:
      return { label: 'Archived', tone: 'neutral' };
  }
}

export default function VicePrincipalParentsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['vp-parents', 'list', search, status],
    queryFn: () => listParents({ search: search.trim() || undefined, status: status ?? undefined }),
  });

  const parents = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta.total ?? 0;

  return (
    <View style={styles.flex}>
      <AppHeader title="Parents" subtitle="School-wide guardian overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email or phone…"
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

        {listQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : listQuery.isError ? (
          <ErrorState
            message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load parents.'}
            onRetry={() => listQuery.refetch()}
          />
        ) : parents.length === 0 ? (
          <EmptyState message="No parents match your search or filters." />
        ) : (
          <>
            <Text style={styles.resultCount}>
              Showing {parents.length} of {total}
              {total > parents.length ? ' — refine your search to narrow further' : ''}
            </Text>
            <View style={styles.list}>
              {parents.map((parent, index) => {
                const meta = statusMeta(parent.status);
                return (
                  <Pressable
                    key={parent.id}
                    style={[styles.row, index === 0 && styles.rowFirst]}
                    onPress={() => router.push(`/(protected)/vice-principal/parents/${parent.id}` as never)}
                  >
                    {parent.photoUrl ? (
                      <Image source={{ uri: parent.photoUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{initialsOf(parent.firstName, parent.lastName)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {parent.firstName} {parent.lastName ?? ''}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {parent.childrenCount} {parent.childrenCount === 1 ? 'child' : 'children'} linked
                      </Text>
                    </View>
                    <StatusBadge {...meta} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 4 },
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
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusChip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  statusChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  statusChipTextActive: { color: '#fff' },
  resultCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 14, marginBottom: 8 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  avatarImage: { width: 42, height: 42, borderRadius: 21, backgroundColor: parentColors.borderSoft },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  rowName: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
