// Principal -> Hostel -- school-level operational oversight,
// real backend data only. All 5 hostel controllers already authorized for
// PRINCIPAL, identical to VICE_PRINCIPAL's own grant -- see
// principal-hostel-api.ts's own comment. Guarded by the parent
// principal/_layout.tsx.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { principalColors } from '@/lib/theme';
import {
  getNightAttendanceOversight,
  listActiveOutings,
  listAllocations,
  listHostelBlocksOversight,
  listHostelComplaintsOversight,
  listHostels,
  listRecentOutingDecisions,
} from '@/lib/principal-hostel-api';

function outingKindLabel(requestType: string | null): string {
  if (requestType === 'HOSTEL_GATE_PASS_REQUEST') return 'on pass';
  if (requestType === 'HOSTEL_EMERGENCY_EXIT_REQUEST') return 'on leave';
  return 'out';
}
function isOverdue(expectedReturn: string): boolean {
  return new Date(expectedReturn).getTime() < Date.now();
}

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
  const today = new Date().toISOString().slice(0, 10);

  const hostelsQuery = useQuery({ queryKey: ['principal-hostel', 'hostels'], queryFn: listHostels });
  const allocationsQuery = useQuery({
    queryKey: ['principal-hostel', 'allocations', 'active'],
    queryFn: () => listAllocations({ status: 'ACTIVE' }),
  });
  const rosterQuery = useQuery({ queryKey: ['principal-hostel', 'roster', today], queryFn: () => getNightAttendanceOversight(today) });
  const blocksQuery = useQuery({ queryKey: ['principal-hostel', 'blocks-oversight'], queryFn: listHostelBlocksOversight });
  const outingsQuery = useQuery({ queryKey: ['principal-hostel', 'active-outings'], queryFn: listActiveOutings });
  const decisionsQuery = useQuery({ queryKey: ['principal-hostel', 'recent-decisions'], queryFn: listRecentOutingDecisions });
  const complaintsQuery = useQuery({ queryKey: ['principal-hostel', 'complaints-oversight'], queryFn: listHostelComplaintsOversight });

  const hostels = hostelsQuery.data ?? [];
  const activeHostels = hostels.filter((h) => h.status === 'ACTIVE');
  const totalCapacity = hostels.reduce((sum, h) => sum + (h.capacity ?? 0), 0);
  const totalOccupied = allocationsQuery.data?.length ?? 0;
  const presentCount = (rosterQuery.data ?? []).filter((r) => r.status === 'PRESENT').length;
  const openComplaints = (complaintsQuery.data ?? []).filter((c) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.state));

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="Hostel" subtitle="School-wide hostel overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{activeHostels.length}</Text>
            <Text style={styles.statLabel}>Active hostels</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            {allocationsQuery.isLoading ? (
              <ActivityIndicator color={principalColors.primary} />
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

        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            {rosterQuery.isLoading ? <ActivityIndicator color={principalColors.primary} /> : <Text style={styles.statValue}>{presentCount}</Text>}
            <Text style={styles.statLabel}>Present tonight</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            {outingsQuery.isLoading ? <ActivityIndicator color={principalColors.primary} /> : <Text style={styles.statValue}>{(outingsQuery.data ?? []).length}</Text>}
            <Text style={styles.statLabel}>Out now</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            {complaintsQuery.isLoading ? <ActivityIndicator color={principalColors.primary} /> : <Text style={styles.statValue}>{openComplaints.length}</Text>}
            <Text style={styles.statLabel}>Open complaints</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Blocks &amp; wardens</Text>
        {blocksQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : (blocksQuery.data ?? []).length === 0 ? (
          <EmptyState message="No blocks on record." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {(blocksQuery.data ?? []).map((b, index) => (
              <View key={b.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{b.name} · {b.hostelName}</Text>
                  <Text style={styles.rowMeta}>{b.roomCount} rooms · {b.occupied}/{b.capacity} occupied</Text>
                </View>
                <Text style={styles.rowMeta}>{b.wardenFirstName ? `${b.wardenFirstName} ${b.wardenLastName ?? ''}`.trim() : 'Unassigned'}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Out of the hostel now</Text>
        {outingsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : (outingsQuery.data ?? []).length === 0 ? (
          <EmptyState message="No students are currently out." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {(outingsQuery.data ?? []).map((o, index) => (
              <View key={o.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{o.studentFirstName} {o.studentLastName ?? ''}</Text>
                  <Text style={styles.rowMeta}>{outingKindLabel(o.requestType)} · Back by {formatDateTime(o.expectedReturn)}</Text>
                </View>
                <StatusBadge label={isOverdue(o.expectedReturn) ? 'Overdue' : 'On time'} tone={isOverdue(o.expectedReturn) ? 'negative' : 'neutral'} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Recent gate decisions</Text>
        {decisionsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : (decisionsQuery.data ?? []).length === 0 ? (
          <EmptyState message="No recent decisions." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {(decisionsQuery.data ?? []).map((o, index) => (
              <View key={o.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{o.studentFirstName} {o.studentLastName ?? ''}</Text>
                  <Text style={styles.rowMeta}>{o.decidedAt ? formatDateTime(o.decidedAt) : '—'}</Text>
                </View>
                <StatusBadge label={humanize(o.state)} tone={o.state === 'APPROVED' ? 'positive' : o.state === 'REJECTED' ? 'negative' : 'neutral'} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Open complaints</Text>
        {complaintsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : openComplaints.length === 0 ? (
          <EmptyState message="No open complaints." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {openComplaints.map((c, index) => (
              <View key={c.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{c.subject}</Text>
                  <Text style={styles.rowMeta}>{humanize(c.issueType)} · {formatDateTime(c.createdAt)}</Text>
                </View>
                <StatusBadge label={humanize(c.state)} tone={c.state === 'ESCALATED' ? 'negative' : 'warning'} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Hostels</Text>
        {hostelsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
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
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 18, marginBottom: 10 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: principalColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 2 },
});
