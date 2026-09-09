// Community -> Proposal detail -- status, decision (via the existing generic
// approvals engine's own GET /approvals/:id, which already authorizes the
// requester), resubmit while SENT_BACK, and a link to the resulting activity
// once APPROVED. Exact same lifecycle already proven on the website's own
// proposal detail page (school-eos-website's community/proposals/[id]).

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { getApproval, getProposal, listInitiatives, resubmitProposal } from '@/lib/community-api';
import { initiativeStatusMeta, proposalStatusMeta } from '@/lib/community-status';
import { parentColors, cardShadow } from '@/lib/theme';

function ResubmitForm({ id, initialTitle, initialDescription }: { id: string; initialTitle: string; initialDescription: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await resubmitProposal(id, { title: title.trim(), description: description.trim() });
      queryClient.invalidateQueries({ queryKey: ['community', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'proposal', id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resubmit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.sectionTitle}>Revise and resubmit</Text>
      <View style={{ marginTop: 12, marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Resubmit</Text>}
      </Pressable>
    </View>
  );
}

export default function ProposalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const proposalQuery = useQuery({ queryKey: ['community', 'proposal', id], queryFn: () => getProposal(id) });
  const approvalQuery = useQuery({
    queryKey: ['community', 'approval', proposalQuery.data?.approvalRequestId],
    queryFn: () => getApproval(proposalQuery.data!.approvalRequestId!),
    enabled: !!proposalQuery.data?.approvalRequestId,
  });
  const initiativesQuery = useQuery({
    queryKey: ['community', 'initiatives'],
    queryFn: listInitiatives,
    enabled: proposalQuery.data?.status === 'APPROVED',
  });

  if (proposalQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Proposal" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (proposalQuery.isError || !proposalQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Proposal" onBack={() => router.back()} />
        <ErrorState
          message={proposalQuery.error instanceof ApiError ? proposalQuery.error.message : "Couldn't load this proposal."}
          onRetry={() => proposalQuery.refetch()}
        />
      </View>
    );
  }

  const proposal = proposalQuery.data;
  const meta = proposalStatusMeta(proposal.status);
  const decidedStep = approvalQuery.data?.steps.find((s) => s.decision);
  const linkedActivity = initiativesQuery.data?.find((a) => a.proposalId === proposal.id);

  return (
    <View style={styles.flex}>
      <AppHeader title={proposal.title} subtitle={proposal.communityName} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.dateText}>Submitted {formatDate(proposal.createdAt)}</Text>
          <StatusBadge {...meta} />
        </View>

        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.body}>{proposal.description}</Text>
        </View>

        {proposal.approvalRequestId ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionTitle}>Decision</Text>
            {approvalQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} style={{ marginTop: 8 }} />
            ) : approvalQuery.data?.request.state === 'PENDING' || approvalQuery.data?.request.state === 'RETROSPECTIVE_PENDING' ? (
              <Text style={styles.mutedBody}>Awaiting Principal review.</Text>
            ) : proposal.status === 'SENT_BACK' ? (
              <Text style={styles.mutedBody}>Sent back to you for revision. Resubmit below to continue.</Text>
            ) : decidedStep ? (
              <View>
                <Text style={styles.body}>
                  {decidedStep.approverRoleCode.charAt(0) + decidedStep.approverRoleCode.slice(1).toLowerCase()}{' '}
                  {decidedStep.decision === 'APPROVED' ? 'approved' : 'rejected'} this proposal
                  {decidedStep.decidedAt ? ` on ${formatDate(decidedStep.decidedAt)}` : ''}.
                </Text>
                {decidedStep.comment ? <Text style={styles.mutedBody}>&ldquo;{decidedStep.comment}&rdquo;</Text> : null}
              </View>
            ) : (
              <Text style={styles.mutedBody}>No decision recorded yet.</Text>
            )}
          </View>
        ) : null}

        {proposal.status === 'APPROVED' ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionTitle}>Linked activity</Text>
            {initiativesQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} style={{ marginTop: 8 }} />
            ) : linkedActivity ? (
              <Pressable
                style={styles.linkRow}
                onPress={() => router.push(`/(protected)/community/activities/${linkedActivity.id}` as never)}
              >
                <Text style={styles.body} numberOfLines={1}>
                  {linkedActivity.title}
                </Text>
                <StatusBadge {...initiativeStatusMeta(linkedActivity.status)} />
              </Pressable>
            ) : (
              <Text style={styles.mutedBody}>Not yet initialized into an activity.</Text>
            )}
          </View>
        ) : null}

        {proposal.status === 'SENT_BACK' ? (
          <ResubmitForm id={proposal.id} initialTitle={proposal.title} initialDescription={proposal.description} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, marginTop: 8, lineHeight: 20 },
  mutedBody: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted, marginTop: 8, lineHeight: 19 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  fieldLabel: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
