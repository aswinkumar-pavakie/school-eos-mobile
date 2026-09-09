// Community -> Proposals -- create + track, real backend calls only
// (community-proposals.controller.ts's own /community-proposals endpoints,
// the exact same ones the website's own Proposals page uses). Ownership is
// resolved server-side from the login's own role_assignment -- this screen
// never sends a community_id.

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { createProposal, listProposals } from '@/lib/community-api';
import { proposalStatusMeta } from '@/lib/community-status';
import { parentColors, cardShadow } from '@/lib/theme';

const PROPOSALS_KEY = ['community', 'proposals'];

function NewProposalTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!title.trim() || !description.trim()) {
      setError('Title and description are both required.');
      return;
    }
    setSubmitting(true);
    try {
      await createProposal({ title: title.trim(), description: description.trim() });
      queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
      setTitle('');
      setDescription('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the proposal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, cardShadow]}>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Annual Sports Day fundraiser"
            placeholderTextColor={parentColors.mutedLight}
          />
        </View>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is being proposed, and why"
            placeholderTextColor={parentColors.mutedLight}
            multiline
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Proposal submitted. Check the History tab.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit proposal</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab() {
  const router = useRouter();
  const listQuery = useQuery({ queryKey: PROPOSALS_KEY, queryFn: listProposals });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
    >
      {listQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : listQuery.isError ? (
        <ErrorState
          message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load proposals.'}
          onRetry={() => listQuery.refetch()}
        />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState message="No proposals yet. Submit one from the New tab." />
      ) : (
        (listQuery.data ?? []).map((proposal) => {
          const meta = proposalStatusMeta(proposal.status);
          return (
            <Pressable
              key={proposal.id}
              style={[styles.card, cardShadow]}
              onPress={() => router.push(`/(protected)/community/proposals/${proposal.id}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subject} numberOfLines={1}>
                    {proposal.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {proposal.communityName} · {formatDate(proposal.createdAt)}
                  </Text>
                </View>
                <StatusBadge {...meta} />
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

export default function ProposalsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'new' | 'history'>('history');

  return (
    <View style={styles.flex}>
      <AppHeader title="Proposals" subtitle="Submit requests to your Principal" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'history', label: 'History' },
          { key: 'new', label: 'New' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'new' ? <NewProposalTab /> : <HistoryTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subject: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
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
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  success: { color: '#1E8A4C', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
