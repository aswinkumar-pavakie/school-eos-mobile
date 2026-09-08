// Two tabs: "Approval" (status === 'PENDING', with Accept/Decline) and "History"
// (already-decided requests, read-only). Accept navigates to the detail screen --
// approving requires setting a time window (ApproveCallRequestDto), which doesn't
// fit an inline list-card action -- but Decline needs no extra data, so it's inline
// here, same as Gate Pass/Emergency Exit's Decline.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { listCallRequests, rejectCallRequest, type CallRequestRow } from '@/lib/hostel-warden-api';
import { callRequestStatusMeta, fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

const QUERY_KEY = ['hostel-warden', 'call-requests'];

// A plain View at the top level, not a Pressable -- see OutingRequestListScreen's
// own comment on why Accept/Decline must never be nested inside a card-wide
// Pressable (unreliable touch handling on a real device).
function RequestCard({ request, children }: { request: CallRequestRow; children?: React.ReactNode }) {
  const router = useRouter();
  const meta = callRequestStatusMeta(request.status);
  return (
    <View style={[styles.card, cardShadow]}>
      <Pressable onPress={() => router.push(`/(protected)/hostel-warden/call-requests/${request.id}` as never)}>
        <View style={styles.cardTop}>
          <Text style={styles.studentName} numberOfLines={1}>
            {fullName(request.studentFirstName, request.studentLastName)}
          </Text>
          <StatusBadge {...meta} />
        </View>
        <Text style={styles.meta}>
          Requested: {formatDateTime(request.requestedFrom)} – {formatDateTime(request.requestedTo)}
        </Text>
      </Pressable>
      {children}
    </View>
  );
}

export default function CallRequestsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'approval' | 'history'>('approval');
  const [decliningId, setDecliningId] = useState<string | null>(null);

  // Polls like the Messages list does -- a parent can submit a new call
  // request at any time while the Warden already has this screen open;
  // without this, a fresh request only ever appeared after a manual
  // pull-to-refresh or leaving and re-entering the screen.
  const listQuery = useQuery({ queryKey: QUERY_KEY, queryFn: listCallRequests, refetchInterval: 15_000 });
  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const pending = useMemo(() => rows.filter((r) => r.status === 'PENDING'), [rows]);
  const decided = useMemo(() => rows.filter((r) => r.status !== 'PENDING'), [rows]);

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectCallRequest(id),
    onMutate: (id) => setDecliningId(id),
    onError: (err) => Alert.alert('Could not reject', err instanceof ApiError ? err.message : 'Please try again.'),
    onSettled: () => {
      setDecliningId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  function confirmDecline(id: string) {
    Alert.alert('Reject this call request?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate(id) },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Parent Call Approval" subtitle="Approve a communication time window" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'approval', label: `Approval${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { key: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        {listQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : listQuery.isError ? (
          <ErrorState message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load requests.'} onRetry={() => listQuery.refetch()} />
        ) : tab === 'approval' ? (
          pending.length === 0 ? (
            <EmptyState message="Nothing pending approval." />
          ) : (
            pending.map((request) => {
              const isDeclining = rejectMutation.isPending && decliningId === request.id;
              return (
                <RequestCard key={request.id} request={request}>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={styles.declineButton}
                      onPress={() => confirmDecline(request.id)}
                      disabled={isDeclining}
                    >
                      {isDeclining ? <ActivityIndicator color="#B33A2E" size="small" /> : <Text style={styles.declineButtonText}>Decline</Text>}
                    </Pressable>
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() => router.push(`/(protected)/hostel-warden/call-requests/${request.id}` as never)}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </Pressable>
                  </View>
                </RequestCard>
              );
            })
          )
        ) : decided.length === 0 ? (
          <EmptyState message="No decided call requests yet." />
        ) : (
          decided.map((request) => <RequestCard key={request.id} request={request} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, flex: 1 },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  declineButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F3C3BC',
    backgroundColor: '#FDECEA',
  },
  declineButtonText: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5 },
  acceptButton: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.blue },
  acceptButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5 },
});
