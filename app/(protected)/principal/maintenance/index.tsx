// Principal -> Repair & Maintenance -- school-level
// operational oversight, real backend data only (repair-requests.controller.ts,
// already authorized for PRINCIPAL, identical to VICE_PRINCIPAL's own grant
// -- see principal-maintenance-api.ts's own comment). Read-only: no
// create/assign/start/complete/cancel actions anywhere in this module.
// Guarded by the parent principal/_layout.tsx.

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
import { getRepairRequestOverview, listRepairRequests } from '@/lib/principal-maintenance-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const STATUS_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const ISSUE_TYPE_VALUES = ['ELECTRICAL', 'PLUMBING', 'CIVIL', 'IT_EQUIPMENT', 'FURNITURE', 'OTHER'];

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

const PRIORITY_OPTIONS = PRIORITY_VALUES.map(humanize);
const ISSUE_TYPE_OPTIONS = ISSUE_TYPE_VALUES.map(humanize);

function statusTone(status: string): StatusTone {
  if (status === 'COMPLETED') return 'positive';
  if (status === 'CANCELLED') return 'negative';
  if (status === 'IN_PROGRESS') return 'warning';
  return 'neutral';
}

export default function PrincipalMaintenanceScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<string | null>(null);

  const overviewQuery = useQuery({ queryKey: ['principal-maintenance', 'overview'], queryFn: getRepairRequestOverview });

  const requestsQuery = useQuery({
    queryKey: ['principal-maintenance', 'requests', search, location, status, priority, issueType],
    queryFn: () =>
      listRepairRequests({
        search: search.trim() || undefined,
        location: location.trim() || undefined,
        status: status ?? undefined,
        priority: priority ?? undefined,
        issueType: issueType ?? undefined,
      }),
  });

  const requests = requestsQuery.data?.data ?? [];
  const total = requestsQuery.data?.meta.total ?? 0;
  const overview = overviewQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title="Repair & Maintenance" subtitle="School-wide maintenance overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {overviewQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginBottom: 12 }} />
        ) : overview ? (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={[styles.statValue, overview.requested > 0 && styles.statValueWarning]}>{overview.requested}</Text>
                <Text style={styles.statLabel}>Requested</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.assigned}</Text>
                <Text style={styles.statLabel}>Assigned</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.inProgress}</Text>
                <Text style={styles.statLabel}>In progress</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.cancelled}</Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Requests</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title…"
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

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Priority"
              value={priority ? humanize(priority) : null}
              placeholder="Any priority"
              options={PRIORITY_OPTIONS}
              onSelect={(label) => setPriority(PRIORITY_VALUES[PRIORITY_OPTIONS.indexOf(label)] ?? null)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Issue type"
              value={issueType ? humanize(issueType) : null}
              placeholder="Any type"
              options={ISSUE_TYPE_OPTIONS}
              onSelect={(label) => setIssueType(ISSUE_TYPE_VALUES[ISSUE_TYPE_OPTIONS.indexOf(label)] ?? null)}
            />
          </View>
        </View>

        {requestsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : requestsQuery.isError ? (
          <ErrorState
            message={requestsQuery.error instanceof ApiError ? requestsQuery.error.message : 'Unable to load repair requests.'}
            onRetry={() => requestsQuery.refetch()}
          />
        ) : requests.length === 0 ? (
          <EmptyState message="No requests match your search or filters." />
        ) : (
          <>
            <Text style={styles.resultCount}>
              Showing {requests.length} of {total}
              {total > requests.length ? ' — refine your search to narrow further' : ''}
            </Text>
            <View style={styles.list}>
              {requests.map((request, index) => (
                <Pressable
                  key={request.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/principal/maintenance/${request.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {request.title}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {humanize(request.issueType)}
                      {request.location ? ` · ${request.location}` : ''}
                      {request.priority === 'URGENT' || request.priority === 'HIGH' ? ` · ${humanize(request.priority)}` : ''}
                    </Text>
                  </View>
                  <StatusBadge label={humanize(request.status)} tone={statusTone(request.status)} />
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
  statValueWarning: { color: '#B77A0A' },
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
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
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
