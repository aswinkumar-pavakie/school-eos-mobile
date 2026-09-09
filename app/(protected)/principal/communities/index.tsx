// Principal -> Communities -- school-level oversight of the
// EXISTING Communities/PTA module, real backend data only (communities
// controller, already authorized for PRINCIPAL, identical to VICE_PRINCIPAL's
// own grant -- see principal-communities-api.ts's own comment). Read-only:
// no create/archive actions anywhere in this module. Guarded by the parent
// principal/_layout.tsx.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { listAcademicYears } from '@/lib/principal-academics-api';
import { listCommunities } from '@/lib/principal-communities-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

const STATE_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function stateTone(state: string): StatusTone {
  if (state === 'ACTIVE') return 'positive';
  if (state === 'SUSPENDED' || state === 'ARCHIVED') return 'negative';
  if (state === 'DRAFT') return 'warning';
  return 'neutral';
}

export default function PrincipalCommunitiesScreen() {
  const router = useRouter();
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>('ACTIVE');

  const yearsQuery = useQuery({ queryKey: ['principal-communities', 'years'], queryFn: listAcademicYears });
  const years = yearsQuery.data ?? [];

  const communitiesQuery = useQuery({
    queryKey: ['principal-communities', 'list', academicYearId, state],
    queryFn: () => listCommunities({ academicYearId: academicYearId ?? undefined, state: state ?? undefined }),
  });
  const communities = communitiesQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Communities" subtitle="Clubs, PTA & student communities" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: 12 }}>
          <SelectField
            label="Academic year"
            value={years.find((y) => y.id === academicYearId)?.name ?? null}
            placeholder={yearsQuery.isLoading ? 'Loading…' : 'All years'}
            options={years.map((y) => y.name)}
            onSelect={(name) => setAcademicYearId(years.find((y) => y.name === name)?.id ?? null)}
            disabled={yearsQuery.isLoading}
          />
        </View>

        <View style={styles.statusRow}>
          {STATE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setState(opt.value)}
              style={[styles.statusChip, state === opt.value && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, state === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {communitiesQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : communitiesQuery.isError ? (
          <ErrorState
            message={communitiesQuery.error instanceof ApiError ? communitiesQuery.error.message : 'Unable to load communities.'}
            onRetry={() => communitiesQuery.refetch()}
          />
        ) : communities.length === 0 ? (
          <EmptyState message="No communities match your filters." />
        ) : (
          <View style={styles.list}>
            {communities.map((community, index) => (
              <Pressable
                key={community.id}
                style={[styles.row, index === 0 && styles.rowFirst]}
                onPress={() => router.push(`/(protected)/principal/communities/${community.id}` as never)}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {community.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {humanize(community.communityCategory)}
                    {community.maxMembers ? ` · Max ${community.maxMembers} members` : ''}
                  </Text>
                </View>
                <StatusBadge label={humanize(community.state)} tone={stateTone(community.state)} />
              </Pressable>
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
