// Vice Principal -> Requests & Approvals (Phase 23) -- real backend data
// only, via the same generic approvals engine every other approval-routed
// feature in this app already uses (see vice-principal-requests-approvals-
// api.ts's own comment for the full authorization model). Read-only list;
// decisions happen on the detail screen. Guarded by the parent
// vice-principal/_layout.tsx.
//
// This list is server-side scoped to requests whose current step's
// approver_role_code the caller actually holds -- there is no unscoped
// "browse everything" mode here, unlike every other VP module this session.
// As of this phase no policy names VICE_PRINCIPAL, so the list is expected
// to be empty; the empty state below says so honestly rather than reading
// as a broken or loading screen.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listApprovals } from '@/lib/vice-principal-requests-approvals-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function stateTone(state: string): StatusTone {
  if (state === 'APPROVED') return 'positive';
  if (state === 'REJECTED') return 'negative';
  if (state === 'SENT_BACK') return 'warning';
  return 'neutral';
}

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';
const TABS: { key: Tab; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function VicePrincipalRequestsApprovalsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('PENDING');

  const listQuery = useQuery({
    queryKey: ['vp-requests-approvals', 'list', tab],
    queryFn: () => listApprovals({ status: tab }),
  });
  const requests = listQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Requests & Approvals" subtitle="Requests awaiting your review" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.statusChip, tab === t.key && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, tab === t.key && styles.statusChipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {listQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : listQuery.isError ? (
          <ErrorState
            message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load requests.'}
            onRetry={() => listQuery.refetch()}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            message={
              tab === 'PENDING'
                ? 'No requests are currently awaiting your review.'
                : `No ${tab.toLowerCase()} requests to show.`
            }
          />
        ) : (
          <View style={styles.list}>
            {requests.map((request, index) => (
              <Pressable
                key={request.id}
                style={[styles.row, index === 0 && styles.rowFirst]}
                onPress={() => router.push(`/(protected)/vice-principal/requests-approvals/${request.id}` as never)}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {humanize(request.requestType)}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {request.requestedByName ?? 'Unknown requester'}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatDateTime(request.createdAt)}
                  </Text>
                </View>
                <StatusBadge label={humanize(request.state)} tone={stateTone(request.state)} />
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
