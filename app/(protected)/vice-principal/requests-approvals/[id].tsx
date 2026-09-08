// Vice Principal -> Request detail (Phase 23) -- real backend data only.
// Approve/Reject/Send back go through the SAME generic approvals engine
// endpoints every other approval-routed feature in this app already uses
// (approveRequest/rejectRequest/sendBackRequest, faculty-approvals-api.ts) --
// no new endpoint, no new approval logic. The backend re-verifies the exact
// same role-and-scope authorization on every decision call regardless of
// what this screen shows or hides, so there is no client-side security
// boundary here, only UX: actions are only offered while the request is
// still open (PENDING/RETROSPECTIVE_PENDING), and disabled while a decision
// is being submitted to prevent duplicate approve/reject/send-back taps.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { ReasonModal } from '@/components/ReasonModal';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import {
  approveRequest,
  getApprovalRequest,
  rejectRequest,
  sendBackRequest,
} from '@/lib/vice-principal-requests-approvals-api';

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

function stateTone(state: string): StatusTone {
  if (state === 'APPROVED') return 'positive';
  if (state === 'REJECTED') return 'negative';
  if (state === 'SENT_BACK') return 'warning';
  return 'neutral';
}

function decisionTone(decision: string | null): StatusTone {
  if (decision === 'APPROVED') return 'positive';
  if (decision === 'REJECTED') return 'negative';
  return 'neutral';
}

export default function VicePrincipalRequestDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'reject' | 'send-back' | null>(null);

  const detailQuery = useQuery({ queryKey: ['vp-requests-approvals', 'detail', id], queryFn: () => getApprovalRequest(id) });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['vp-requests-approvals'] });
  }

  async function handleApprove() {
    setBusy(true);
    try {
      await approveRequest(id);
      await refresh();
    } catch (err) {
      Alert.alert('Could not approve request', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(reason: string) {
    setBusy(true);
    try {
      await rejectRequest(id, reason);
      setModal(null);
      await refresh();
    } catch (err) {
      Alert.alert('Could not reject request', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendBack(reason: string) {
    setBusy(true);
    try {
      await sendBackRequest(id, reason);
      setModal(null);
      await refresh();
    } catch (err) {
      Alert.alert('Could not send back request', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (detailQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Request" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Request" onBack={() => router.back()} />
        <ErrorState
          message={
            detailQuery.error instanceof ApiError
              ? detailQuery.error.message
              : "Couldn't load this request. You may not be authorized to view it."
          }
          onRetry={() => detailQuery.refetch()}
        />
      </View>
    );
  }

  const { request, steps } = detailQuery.data;
  const canDecide = OPEN_STATES.includes(request.state);

  return (
    <View style={styles.flex}>
      <AppHeader title={humanize(request.requestType)} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>{request.requestedByName ?? 'Unknown requester'}</Text>
          <StatusBadge label={humanize(request.state)} tone={stateTone(request.state)} />
        </View>

        <Text style={styles.sectionTitle}>Request information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Submitted</Text>
            <Text style={styles.infoValue}>{formatDateTime(request.createdAt)}</Text>
          </View>
          {request.dueAt ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Due</Text>
              <Text style={styles.infoValue}>{formatDateTime(request.dueAt)}</Text>
            </View>
          ) : null}
          {request.decidedAt ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Decided</Text>
              <Text style={styles.infoValue}>{formatDateTime(request.decidedAt)}</Text>
            </View>
          ) : null}
          {request.amountPaise ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Amount</Text>
              <Text style={styles.infoValue}>₹{(Number(request.amountPaise) / 100).toLocaleString('en-IN')}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Approval history</Text>
        <View style={[styles.listCard, cardShadow]}>
          {steps.map((step, index) => (
            <View key={step.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.infoValue}>
                  Step {step.sequenceNo} · {humanize(step.approverRoleCode)}
                </Text>
                {step.decidedAt ? (
                  <Text style={styles.rowMeta}>{formatDateTime(step.decidedAt)}</Text>
                ) : (
                  <Text style={styles.rowMeta}>Awaiting decision</Text>
                )}
                {step.comment ? <Text style={styles.rowMeta}>&quot;{step.comment}&quot;</Text> : null}
              </View>
              {step.decision ? <StatusBadge label={humanize(step.decision)} tone={decisionTone(step.decision)} /> : null}
            </View>
          ))}
        </View>

        {canDecide ? (
          <View style={styles.actionsRow}>
            <Pressable style={[styles.actionButton, styles.approveButton]} onPress={handleApprove} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Approve</Text>}
            </Pressable>
            <Pressable style={[styles.actionButton, styles.sendBackButton]} onPress={() => setModal('send-back')} disabled={busy}>
              <Text style={[styles.actionButtonText, styles.sendBackButtonText]}>Send back</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.rejectButton]} onPress={() => setModal('reject')} disabled={busy}>
              <Text style={styles.actionButtonText}>Reject</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <ReasonModal
        visible={modal === 'reject'}
        title="Reject request"
        submitLabel="Reject"
        submitting={busy}
        onCancel={() => setModal(null)}
        onSubmit={handleReject}
      />
      <ReasonModal
        visible={modal === 'send-back'}
        title="Send back request"
        submitLabel="Send back"
        submitting={busy}
        onCancel={() => setModal(null)}
        onSubmit={handleSendBack}
      />
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
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionButton: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  approveButton: { backgroundColor: '#1E8A4C' },
  sendBackButton: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#B77A0A' },
  sendBackButtonText: { color: '#B77A0A' },
  rejectButton: { backgroundColor: '#B33A2E' },
  actionButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13.5, color: '#fff' },
});
