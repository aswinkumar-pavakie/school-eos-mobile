// Vice Principal -> Leave request detail (Phase 28) -- view-only plus
// Withdraw, real backend data only. Withdraw reuses the generic approvals
// engine's own existing POST /approvals/:id/withdraw (requester-only,
// still-open-only, already enforced there) -- not a new cancel workflow.
// No edit action -- there is no update endpoint for a submitted leave
// request in the real backend, matching this phase's own "don't fabricate"
// instruction.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getMyLeaveRequest, withdrawMyLeaveRequest } from '@/lib/vice-principal-my-leave-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const OPEN_STATES = ['PENDING', 'RETROSPECTIVE_PENDING'];

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

function decisionTone(decision: string | null): StatusTone {
  if (decision === 'APPROVED') return 'positive';
  if (decision === 'REJECTED') return 'negative';
  return 'neutral';
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
}

export default function VicePrincipalMyLeaveDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [withdrawing, setWithdrawing] = useState(false);

  const query = useQuery({ queryKey: ['vp-my-leave', 'detail', id], queryFn: () => getMyLeaveRequest(id) });

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await withdrawMyLeaveRequest(id);
      await queryClient.invalidateQueries({ queryKey: ['vp-my-leave'] });
      router.back();
    } catch (err) {
      Alert.alert('Could not withdraw request', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setWithdrawing(false);
    }
  }

  if (query.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Leave request" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Leave request" onBack={() => router.back()} />
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : "Couldn't load this leave request."}
          onRetry={() => query.refetch()}
        />
      </View>
    );
  }

  const leave = query.data;
  const state = effectiveState(leave);
  const canWithdraw = OPEN_STATES.includes(state);

  return (
    <View style={styles.flex}>
      <AppHeader title={humanize(leave.leaveType)} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>
            {daysBetween(leave.fromDate, leave.toDate)} day{daysBetween(leave.fromDate, leave.toDate) > 1 ? 's' : ''}
          </Text>
          <StatusBadge label={humanize(state)} tone={stateTone(state)} />
        </View>

        <Text style={styles.sectionTitle}>Request information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>From</Text>
            <Text style={styles.infoValue}>{formatDate(leave.fromDate)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>To</Text>
            <Text style={styles.infoValue}>{formatDate(leave.toDate)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Submitted</Text>
            <Text style={styles.infoValue}>{formatDateTime(leave.createdAt)}</Text>
          </View>
          {leave.decidedAt ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Decided</Text>
              <Text style={styles.infoValue}>{formatDateTime(leave.decidedAt)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Reason</Text>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.body}>{leave.reason}</Text>
        </View>

        {leave.approvalSteps.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Approval status</Text>
            <View style={[styles.listCard, cardShadow]}>
              {leave.approvalSteps.map((step, index) => (
                <View key={step.sequenceNo} style={[styles.infoRow, index > 0 && styles.infoRowBorder, { alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.infoValue}>{humanize(step.approverRoleCode)}</Text>
                    <Text style={styles.rowMeta}>
                      {step.decidedAt ? formatDateTime(step.decidedAt) : 'Awaiting decision'}
                    </Text>
                    {step.comment ? <Text style={styles.rowMeta}>&quot;{step.comment}&quot;</Text> : null}
                  </View>
                  {step.decision ? <StatusBadge label={humanize(step.decision)} tone={decisionTone(step.decision)} /> : null}
                </View>
              ))}
            </View>
          </>
        ) : null}

        {canWithdraw ? (
          <Pressable style={styles.withdrawButton} onPress={handleWithdraw} disabled={withdrawing}>
            {withdrawing ? <ActivityIndicator color="#B33A2E" /> : <Text style={styles.withdrawButtonText}>Withdraw request</Text>}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 20 },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  withdrawButton: {
    marginTop: 22,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#B33A2E',
  },
  withdrawButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#B33A2E' },
});
