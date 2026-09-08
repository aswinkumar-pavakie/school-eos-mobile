// Shared detail/approve-reject screen body for Gate Pass and Emergency Exit -- see
// OutingRequestListScreen.tsx's header comment for why this is shared.
//
// Approve is optional-comment (DecideApprovalDto); reject REQUIRES a comment
// (RejectApprovalDto -- "Reject always demands a reason" is the design system's own
// rule, not invented here) -- see ReasonModal. Both actions disable while pending
// and a 409 (already decided) surfaces the backend's own message directly, then
// refetches so the screen never shows a stale PENDING state.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { ReasonModal } from '@/components/ReasonModal';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { OutingRequestRow } from '@/lib/hostel-warden-api';
import { fullName, outingRequestStatusMeta } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

export function OutingRequestDetailScreen({
  id,
  title,
  listQueryKey,
  getFn,
  approveFn,
  rejectFn,
  approveConfirmTitle,
}: {
  id: string;
  title: string;
  listQueryKey: string;
  getFn: (id: string) => Promise<OutingRequestRow>;
  approveFn: (id: string, comment?: string) => Promise<OutingRequestRow>;
  rejectFn: (id: string, comment: string) => Promise<OutingRequestRow>;
  approveConfirmTitle: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  const queryKey = ['hostel-warden', listQueryKey, id];
  const detailQuery = useQuery({ queryKey, queryFn: () => getFn(id) });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['hostel-warden', listQueryKey] });
  }

  const approveMutation = useMutation({
    mutationFn: () => approveFn(id),
    onSuccess: invalidateAll,
    onError: (err) => {
      Alert.alert('Could not approve', err instanceof ApiError ? err.message : 'Please try again.');
      invalidateAll();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (comment: string) => rejectFn(id, comment),
    onSuccess: () => {
      setRejectModalVisible(false);
      invalidateAll();
    },
    onError: (err) => {
      setRejectModalVisible(false);
      Alert.alert('Could not reject', err instanceof ApiError ? err.message : 'Please try again.');
      invalidateAll();
    },
  });

  function confirmApprove(request: OutingRequestRow) {
    Alert.alert(
      approveConfirmTitle,
      `Student: ${fullName(request.studentFirstName, request.studentLastName)}\nExpected return: ${formatDateTime(request.expectedReturn)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveMutation.mutate() },
      ],
    );
  }

  const request = detailQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title={title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {detailQuery.isLoading || !request ? (
          detailQuery.isError ? (
            <ErrorState
              message={detailQuery.error instanceof ApiError ? detailQuery.error.message : 'Unable to load this request.'}
              onRetry={() => detailQuery.refetch()}
            />
          ) : (
            <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
          )
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
              <View style={styles.headerRow}>
                <Text style={styles.studentName}>{fullName(request.studentFirstName, request.studentLastName)}</Text>
                <StatusBadge {...outingRequestStatusMeta(request.state)} />
              </View>

              <Text style={styles.rowLabel}>Reason</Text>
              <Text style={styles.rowValue}>{request.reason}</Text>

              {request.destination ? (
                <>
                  <Text style={[styles.rowLabel, { marginTop: 12 }]}>Destination</Text>
                  <Text style={styles.rowValue}>{request.destination}</Text>
                </>
              ) : null}

              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Out from</Text>
              <Text style={styles.rowValue}>{formatDateTime(request.outFrom)}</Text>

              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Expected return</Text>
              <Text style={styles.rowValue}>{formatDateTime(request.expectedReturn)}</Text>

              {request.isOvernight ? (
                <Text style={[styles.rowValue, { marginTop: 8 }]}>Overnight outing</Text>
              ) : null}
            </View>

            {request.state === 'REQUESTED' ? (
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.rejectButton}
                  onPress={() => setRejectModalVisible(true)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </Pressable>
                <Pressable
                  style={styles.approveButton}
                  onPress={() => confirmApprove(request)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.approveButtonText}>Approve</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <ReasonModal
        visible={rejectModalVisible}
        title={`Reject ${title.toLowerCase()}`}
        submitLabel="Reject"
        submitting={rejectMutation.isPending}
        onCancel={() => setRejectModalVisible(false)}
        onSubmit={(reason) => rejectMutation.mutate(reason)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  studentName: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, flex: 1 },
  rowLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: parentColors.mutedLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowValue: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  rejectButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F3C3BC',
    backgroundColor: '#FDECEA',
  },
  rejectButtonText: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
  approveButton: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: parentColors.blue },
  approveButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
});
