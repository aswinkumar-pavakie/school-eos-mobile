// Community -> Activities -- initialized from a Community's own APPROVED
// proposal, real backend calls only (community-initiatives.controller.ts's
// own endpoints, same ones the website's Activities page uses).

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { SelectField } from '@/components/SelectField';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { createInitiative, listInitiatives, listProposals } from '@/lib/community-api';
import { initiativeStatusMeta } from '@/lib/community-status';
import { parentColors, cardShadow } from '@/lib/theme';

const INITIATIVES_KEY = ['community', 'initiatives'];
const PROPOSALS_KEY = ['community', 'proposals'];

function InitializeTab() {
  const queryClient = useQueryClient();
  const proposalsQuery = useQuery({ queryKey: PROPOSALS_KEY, queryFn: listProposals });
  const approved = (proposalsQuery.data ?? []).filter((p) => p.status === 'APPROVED');

  const [proposalTitle, setProposalTitle] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selected = approved.find((p) => p.title === proposalTitle) ?? null;

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!selected) {
      setError('Select an approved proposal.');
      return;
    }
    setSubmitting(true);
    try {
      await createInitiative({ proposalId: selected.id });
      queryClient.invalidateQueries({ queryKey: INITIATIVES_KEY });
      setProposalTitle(null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not initialize the activity.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, cardShadow]}>
        <View style={{ marginBottom: 16 }}>
          <SelectField
            label="Approved proposal"
            value={proposalTitle}
            placeholder={proposalsQuery.isLoading ? 'Loading…' : approved.length === 0 ? 'No approved proposals yet' : 'Select a proposal'}
            options={approved.map((p) => p.title)}
            onSelect={setProposalTitle}
            disabled={proposalsQuery.isLoading || approved.length === 0}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Activity initialized. Add planning details from its detail page.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Initialize activity</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab() {
  const router = useRouter();
  const listQuery = useQuery({ queryKey: INITIATIVES_KEY, queryFn: listInitiatives });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
    >
      {listQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : listQuery.isError ? (
        <ErrorState
          message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load activities.'}
          onRetry={() => listQuery.refetch()}
        />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState message="No activities yet. Once a proposal is approved, initialize it from the Initialize tab." />
      ) : (
        (listQuery.data ?? []).map((initiative) => {
          const meta = initiativeStatusMeta(initiative.status);
          return (
            <Pressable
              key={initiative.id}
              style={[styles.card, cardShadow]}
              onPress={() => router.push(`/(protected)/community/activities/${initiative.id}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subject} numberOfLines={1}>
                    {initiative.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {initiative.communityName}
                    {initiative.plannedDate ? ` · ${formatDate(initiative.plannedDate)}` : ''}
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

export default function ActivitiesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'history' | 'initialize'>('history');

  return (
    <View style={styles.flex}>
      <AppHeader title="Activities" subtitle="From proposal to completion" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'history', label: 'All activities' },
          { key: 'initialize', label: 'Initialize' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'initialize' ? <InitializeTab /> : <HistoryTab />}
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
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  success: { color: '#1E8A4C', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
