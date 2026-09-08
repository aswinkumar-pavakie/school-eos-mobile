// Vice Principal -> Announcements (Phase 20) -- school-wide, role-targeted
// announcement oversight, real backend data only (GET /announcements, already
// authorized for VICE_PRINCIPAL since the VP dashboard, Phase 3 -- see
// vice-principal-announcements-api.ts's own comment). Read-only: no create/
// archive actions anywhere in this module. Guarded by the parent
// vice-principal/_layout.tsx.
//
// Search and priority are client-side narrowing of the already-loaded list --
// the backend has no search or priority filter param, only roleCode and
// includeArchived, both real server-side params used below. Never presented
// as a server-side search.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listAnnouncements, type AnnouncementRow } from '@/lib/vice-principal-announcements-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function announcementMeta(row: { priority: string; isEmergency: boolean }): { label: string; tone: StatusTone } {
  if (row.isEmergency) return { label: 'Emergency', tone: 'negative' };
  if (row.priority === 'HIGH' || row.priority === 'URGENT') return { label: humanize(row.priority), tone: 'warning' };
  return { label: humanize(row.priority), tone: 'neutral' };
}

const PRIORITY_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
];

function audienceLabel(announcement: AnnouncementRow): string {
  if (announcement.audiences.length === 0) return 'No audience';
  if (announcement.audiences.some((a) => a.audienceType === 'SCHOOL')) return 'School-wide';
  const roles = announcement.audiences.filter((a) => a.audienceType === 'ROLE' && a.targetRole).map((a) => humanize(a.targetRole as string));
  if (roles.length > 0) return roles.join(', ');
  const other = announcement.audiences[0];
  return other ? humanize(other.audienceType) : 'No audience';
}

export default function VicePrincipalAnnouncementsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<string | null>(null);
  const [audienceRole, setAudienceRole] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  // A separate, always-unfiltered fetch purely to derive the real set of
  // target roles actually in use, for the Audience filter -- never invented.
  const allRolesQuery = useQuery({
    queryKey: ['vp-announcements', 'all-for-roles'],
    queryFn: () => listAnnouncements({ includeArchived: true }),
  });
  const audienceRoleOptions = useMemo(() => {
    const roles = new Set<string>();
    for (const a of allRolesQuery.data ?? []) {
      for (const aud of a.audiences) {
        if (aud.audienceType === 'ROLE' && aud.targetRole) roles.add(aud.targetRole);
      }
    }
    return Array.from(roles).sort();
  }, [allRolesQuery.data]);

  const announcementsQuery = useQuery({
    queryKey: ['vp-announcements', 'list', audienceRole, includeArchived],
    queryFn: () => listAnnouncements({ roleCode: audienceRole ?? undefined, includeArchived }),
  });

  const filtered = (announcementsQuery.data ?? []).filter((a) => {
    if (priority && a.priority !== priority) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.body.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="Announcements" subtitle="School-wide announcements" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title or content…"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.searchInput}
        />

        <View style={{ marginBottom: 12 }}>
          <SelectField
            label="Audience"
            value={audienceRole ? humanize(audienceRole) : null}
            placeholder="All audiences"
            options={audienceRoleOptions.map(humanize)}
            onSelect={(label) => setAudienceRole(audienceRoleOptions.find((r) => humanize(r) === label) ?? null)}
            disabled={allRolesQuery.isLoading}
          />
        </View>

        <View style={styles.statusRow}>
          {PRIORITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setPriority(opt.value)}
              style={[styles.statusChip, priority === opt.value && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, priority === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setIncludeArchived((v) => !v)}
            style={[styles.statusChip, includeArchived && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, includeArchived && styles.statusChipTextActive]}>Include archived</Text>
          </Pressable>
        </View>

        {announcementsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : announcementsQuery.isError ? (
          <ErrorState
            message={announcementsQuery.error instanceof ApiError ? announcementsQuery.error.message : 'Unable to load announcements.'}
            onRetry={() => announcementsQuery.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState message="No announcements match your search or filters." />
        ) : (
          <View style={styles.list}>
            {filtered.map((announcement, index) => {
              const meta = announcementMeta(announcement);
              return (
                <Pressable
                  key={announcement.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/vice-principal/announcements/${announcement.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {announcement.title}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {audienceLabel(announcement)}
                      {announcement.category ? ` · ${announcement.category}` : ''}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {formatDateTime(announcement.publishAt ?? announcement.createdAt)}
                      {announcement.state === 'ARCHIVED' ? ' · Archived' : ''}
                    </Text>
                  </View>
                  <StatusBadge {...meta} />
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
