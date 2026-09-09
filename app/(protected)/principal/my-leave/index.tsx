// Principal -> My Leave -- the authenticated Principal's OWN leave requests
// only, real backend data (GET /staff/me/leave-requests, self-scoped -- see
// principal-my-leave-api.ts's own comment, PRINCIPAL already authorized
// identical to VICE_PRINCIPAL, plus the disclosed approval_policy caveat for
// this specific request type). Distinct from any school-wide leave/HR
// administration, which does not exist in this app at all.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listMyLeaveRequests } from '@/lib/principal-my-leave-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function effectiveState(leave: { state: string; approvalState: string | null }): string {
  return leave.approvalState ?? leave.state;
}

function stateTone(state: string): StatusTone {
  if (state === 'APPROVED') return 'positive';
  if (state === 'REJECTED' || state === 'CANCELLED') return 'negative';
  return 'neutral';
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
}

export default function PrincipalMyLeaveScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['principal-my-leave', 'list'], queryFn: listMyLeaveRequests });
  const [filter, setFilter] = useState<string | null>(null);

  const requests = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(
    () => (filter ? requests.filter((r) => effectiveState(r) === filter) : requests),
    [requests, filter],
  );
  const filterOptions = useMemo(() => {
    const states = new Set(requests.map(effectiveState));
    return Array.from(states);
  }, [requests]);

  return (
    <View style={styles.flex}>
      <AppHeader title="My Leave" subtitle="Your own leave requests" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.applyButton} onPress={() => router.push('/(protected)/principal/my-leave/apply' as never)}>
          <Text style={styles.applyButtonText}>+ Apply for leave</Text>
        </Pressable>

        {requests.length > 0 ? (
          <View style={styles.statusRow}>
            <Pressable onPress={() => setFilter(null)} style={[styles.statusChip, filter === null && styles.statusChipActive]}>
              <Text style={[styles.statusChipText, filter === null && styles.statusChipTextActive]}>All</Text>
            </Pressable>
            {filterOptions.map((s) => (
              <Pressable key={s} onPress={() => setFilter(s)} style={[styles.statusChip, filter === s && styles.statusChipActive]}>
                <Text style={[styles.statusChipText, filter === s && styles.statusChipTextActive]}>{humanize(s)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {query.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : 'Unable to load your leave requests.'}
            onRetry={() => query.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState message={requests.length === 0 ? 'You have no leave requests yet.' : 'No requests match this filter.'} />
        ) : (
          <View style={styles.list}>
            {filtered.map((request, index) => {
              const state = effectiveState(request);
              return (
                <Pressable
                  key={request.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/principal/my-leave/${request.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle}>{humanize(request.leaveType)}</Text>
                    <Text style={styles.rowMeta}>
                      {formatDate(request.fromDate)} – {formatDate(request.toDate)} ·{' '}
                      {daysBetween(request.fromDate, request.toDate)} day(s)
                    </Text>
                  </View>
                  <StatusBadge label={humanize(state)} tone={stateTone(state)} />
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
  applyButton: {
    backgroundColor: parentColors.blue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  applyButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: '#fff' },
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
