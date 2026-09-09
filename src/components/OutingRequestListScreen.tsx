// Shared list screen body for Gate Pass and Emergency Exit -- both are backed by
// the same outing_request table and identical mechanics on the backend (see
// OutingRequestsSharedService); only the copy, the query key, and which API
// functions get called differ. Each route file stays a thin, distinctly-named
// entry point (see gate-pass-requests/index.tsx / emergency-exit-requests/index.tsx)
// so the two domains remain visually and semantically distinct to the Warden, per
// the task's "do not merge" instruction -- only the rendering code is shared.
//
// Two tabs: "Approval" (state === 'REQUESTED', with inline Accept/Decline -- Accept
// is a plain confirm, Decline opens ReasonModal since RejectApprovalDto.comment is
// required) and "History" (everything already decided, read-only). Split
// client-side from one list call -- no separate pending/history endpoint exists or
// is needed for a Warden's own, typically-small request queue.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { ReasonModal } from '@/components/ReasonModal';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { OutingRequestRow } from '@/lib/hostel-warden-api';
import { fullName, outingRequestStatusMeta } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

interface Props {
  title: string;
  subtitle: string;
  emptyMessage: string;
  queryKey: string;
  listFn: () => Promise<OutingRequestRow[]>;
  detailHref: (id: string) => string;
  approveFn: (id: string, comment?: string) => Promise<OutingRequestRow>;
  rejectFn: (id: string, comment: string) => Promise<OutingRequestRow>;
  approveConfirmTitle: string;
}

// A plain View, NOT a Pressable, at the top level -- nesting the Accept/Decline
// Pressables (in `children`) inside an outer card-wide Pressable is a well-known
// React Native footgun: the two touchables fight over the responder, and which one
// actually receives the tap is unreliable on a real device even when it looks fine
// in a JS-only test renderer (found via a real-device report, not caught by this
// screen's own jest tests). Only the "view detail" info block is itself a
// Pressable, kept as a sibling to the actions row -- never an ancestor of it.
function RequestCard({
  request,
  detailHref,
  children,
}: {
  request: OutingRequestRow;
  detailHref: (id: string) => string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const meta = outingRequestStatusMeta(request.state);
  return (
    <View style={[styles.card, cardShadow]}>
      <Pressable onPress={() => router.push(detailHref(request.id) as never)}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName} numberOfLines={1}>
              {fullName(request.studentFirstName, request.studentLastName)}
            </Text>
            <Text style={styles.reason} numberOfLines={2}>
              {request.reason}
            </Text>
          </View>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </View>
        <Text style={styles.meta}>Out: {formatDateTime(request.outFrom)}</Text>
        <Text style={styles.meta}>Expected return: {formatDateTime(request.expectedReturn)}</Text>
      </Pressable>
      {children}
    </View>
  );
}

export function OutingRequestListScreen({
  title,
  subtitle,
  emptyMessage,
  queryKey,
  listFn,
  detailHref,
  approveFn,
  rejectFn,
  approveConfirmTitle,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'approval' | 'history'>('approval');
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const fullQueryKey = ['hostel-warden', queryKey];
  // Polls like the Messages list does -- a parent can submit a new request at
  // any time while the Warden already has this screen open; without this, a
  // fresh request only ever appeared after a manual pull-to-refresh or
  // leaving and re-entering the screen, which read as "the request never
  // arrived" even though the backend had it immediately.
  const listQuery = useQuery({ queryKey: fullQueryKey, queryFn: listFn, refetchInterval: 15_000 });
  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const pending = useMemo(() => rows.filter((r) => r.state === 'REQUESTED'), [rows]);
  const decided = useMemo(() => rows.filter((r) => r.state !== 'REQUESTED'), [rows]);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveFn(id),
    onMutate: (id) => setDecidingId(id),
    onError: (err) => Alert.alert('Could not approve', err instanceof ApiError ? err.message : 'Please try again.'),
    onSettled: () => {
      setDecidingId(null);
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectFn(id, comment),
    onMutate: ({ id }) => setDecidingId(id),
    onSuccess: () => setRejectTargetId(null),
    onError: (err) => {
      setRejectTargetId(null);
      Alert.alert('Could not reject', err instanceof ApiError ? err.message : 'Please try again.');
    },
    onSettled: () => {
      setDecidingId(null);
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
    },
  });

  function confirmApprove(request: OutingRequestRow) {
    Alert.alert(
      approveConfirmTitle,
      `Student: ${fullName(request.studentFirstName, request.studentLastName)}\nExpected return: ${formatDateTime(request.expectedReturn)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveMutation.mutate(request.id) },
      ],
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader title={title} subtitle={subtitle} onBack={() => router.back()} />
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
          <ErrorState
            message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load requests.'}
            onRetry={() => listQuery.refetch()}
          />
        ) : tab === 'approval' ? (
          pending.length === 0 ? (
            <EmptyState message="Nothing pending approval." />
          ) : (
            pending.map((request) => {
              const isDeciding = (approveMutation.isPending || rejectMutation.isPending) && decidingId === request.id;
              return (
                <RequestCard key={request.id} request={request} detailHref={detailHref}>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={styles.declineButton}
                      onPress={() => setRejectTargetId(request.id)}
                      disabled={isDeciding}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() => confirmApprove(request)}
                      disabled={isDeciding}
                    >
                      {isDeciding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptButtonText}>Accept</Text>}
                    </Pressable>
                  </View>
                </RequestCard>
              );
            })
          )
        ) : decided.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          decided.map((request) => <RequestCard key={request.id} request={request} detailHref={detailHref} />)
        )}
      </ScrollView>

      <ReasonModal
        visible={!!rejectTargetId}
        title={`Reject ${title.toLowerCase()}`}
        submitLabel="Reject"
        submitting={rejectMutation.isPending}
        onCancel={() => setRejectTargetId(null)}
        onSubmit={(reason) => rejectMutation.mutate({ id: rejectTargetId!, comment: reason })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  studentName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  reason: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, marginTop: 2 },
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
