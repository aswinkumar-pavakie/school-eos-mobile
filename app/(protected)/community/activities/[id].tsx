// Community -> Activity detail -- planning (editable only while PLANNED),
// progress (only while IN_PROGRESS), completion (only while IN_PROGRESS).
// Every transition is still enforced server-side; this screen only shows the
// action that's currently valid, matching the exact lifecycle already proven
// on the website (community-initiatives.service.ts's own state checks).

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  completeInitiative,
  getInitiative,
  startInitiative,
  updateInitiative,
  updateInitiativeProgress,
  type InitiativeRow,
} from '@/lib/community-api';
import { initiativeStatusMeta } from '@/lib/community-status';
import { parentColors, cardShadow } from '@/lib/theme';

const KEY = (id: string) => ['community', 'initiative', id];

function EditPlanningForm({ initiative }: { initiative: InitiativeRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initiative.title);
  const [description, setDescription] = useState(initiative.description);
  const [venue, setVenue] = useState(initiative.venue ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await updateInitiative(initiative.id, { title: title.trim(), description: description.trim(), venue: venue.trim() || undefined });
      queryClient.invalidateQueries({ queryKey: KEY(initiative.id) });
      queryClient.invalidateQueries({ queryKey: ['community', 'initiatives'] });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={styles.linkButton}>
        <Text style={styles.linkButtonText}>Edit planning</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.sectionTitle}>Edit planning</Text>
      <View style={{ marginTop: 12, marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>Venue</Text>
        <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholder="e.g. School auditorium" placeholderTextColor={parentColors.mutedLight} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable style={styles.cancelButton} onPress={() => setOpen(false)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.submitButton, { flex: 1 }, submitting && styles.submitButtonDisabled]} onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: KEY(id), queryFn: () => getInitiative(id) });

  const [progressNotes, setProgressNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: KEY(id) });
    await queryClient.invalidateQueries({ queryKey: ['community', 'initiatives'] });
  }

  async function handleStart() {
    setError(null);
    setBusy(true);
    try {
      await startInitiative(id);
      await invalidate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the activity.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProgress() {
    setError(null);
    if (!progressNotes.trim()) {
      setError('Progress notes are required.');
      return;
    }
    setBusy(true);
    try {
      await updateInitiativeProgress(id, progressNotes.trim());
      await invalidate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save progress.');
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setError(null);
    setBusy(true);
    try {
      await completeInitiative(id, outcome.trim() || undefined);
      await invalidate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete the activity.');
    } finally {
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Activity" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Activity" onBack={() => router.back()} />
        <ErrorState message={query.error instanceof ApiError ? query.error.message : "Couldn't load this activity."} onRetry={() => query.refetch()} />
      </View>
    );
  }

  const initiative = query.data;
  const meta = initiativeStatusMeta(initiative.status);

  return (
    <View style={styles.flex}>
      <AppHeader title={initiative.title} subtitle={initiative.communityName} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.dateText}>
            {initiative.plannedDate ? `Planned ${formatDate(initiative.plannedDate)}` : 'No planned date'}
            {initiative.venue ? ` · ${initiative.venue}` : ''}
          </Text>
          <StatusBadge {...meta} />
        </View>

        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.body}>{initiative.description}</Text>
        </View>

        {initiative.status === 'PLANNED' ? (
          <>
            <EditPlanningForm initiative={initiative} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.submitButton, busy && styles.submitButtonDisabled]} onPress={handleStart} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Start activity</Text>}
            </Pressable>
          </>
        ) : null}

        {initiative.status === 'IN_PROGRESS' ? (
          <>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.sectionTitle}>Progress</Text>
              <TextInput
                style={[styles.input, styles.multiline, { marginTop: 10 }]}
                value={progressNotes || initiative.progressNotes || ''}
                onChangeText={setProgressNotes}
                placeholder="What's the current progress?"
                placeholderTextColor={parentColors.mutedLight}
                multiline
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={[styles.submitButton, busy && styles.submitButtonDisabled]} onPress={handleSaveProgress} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save progress</Text>}
              </Pressable>
            </View>

            <View style={[styles.card, cardShadow]}>
              <Text style={styles.sectionTitle}>Mark complete</Text>
              <TextInput
                style={[styles.input, styles.multiline, { marginTop: 10 }]}
                value={outcome}
                onChangeText={setOutcome}
                placeholder="What was the result? (optional)"
                placeholderTextColor={parentColors.mutedLight}
                multiline
              />
              <Pressable style={[styles.submitButton, busy && styles.submitButtonDisabled]} onPress={handleComplete} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Mark complete</Text>}
              </Pressable>
            </View>
          </>
        ) : null}

        {initiative.status === 'COMPLETED' ? (
          <>
            {initiative.progressNotes ? (
              <View style={[styles.card, cardShadow]}>
                <Text style={styles.sectionTitle}>Progress</Text>
                <Text style={styles.body}>{initiative.progressNotes}</Text>
              </View>
            ) : null}
            {initiative.outcome ? (
              <View style={[styles.card, cardShadow]}>
                <Text style={styles.sectionTitle}>Outcome</Text>
                <Text style={styles.body}>{initiative.outcome}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        <Pressable
          style={styles.linkButton}
          onPress={() => router.push(`/(protected)/community/proposals/${initiative.proposalId}` as never)}
        >
          <Text style={styles.linkButtonText}>View originating proposal</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, flex: 1, marginRight: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, marginTop: 8, lineHeight: 20 },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginTop: 8 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cancelButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  cancelButtonText: { color: parentColors.ink, fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  linkButton: { alignItems: 'center', paddingVertical: 10 },
  linkButtonText: { color: parentColors.blue, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
