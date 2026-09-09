// Hostel Complaints -- two tabs: "Report an issue" (create form, with a real
// block/room picker backed by GET /hostel/blocks) and "History" (past complaints +
// status). Warden cannot reassign maintenance staff (no control for it anywhere
// here) and can only move a complaint through backend-allowed state transitions
// (see hostel-warden-status.ts's HOSTEL_COMPLAINT_ALLOWED_TRANSITIONS, mirrored
// from the backend's own).

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { SelectField } from '@/components/SelectField';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  createComplaint,
  listComplaints,
  listHostelStructure,
  HOSTEL_ISSUE_TYPE_LABELS,
  HOSTEL_ISSUE_TYPES,
  type HostelIssueType,
} from '@/lib/hostel-warden-api';
import { complaintStatusMeta, issueTypeLabel } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

const COMPLAINTS_KEY = ['hostel-warden', 'complaints'];
const ISSUE_TYPE_OPTIONS = HOSTEL_ISSUE_TYPES.map((t) => HOSTEL_ISSUE_TYPE_LABELS[t]);
const LABEL_TO_ISSUE_TYPE = Object.fromEntries(HOSTEL_ISSUE_TYPES.map((t) => [HOSTEL_ISSUE_TYPE_LABELS[t], t])) as Record<
  string,
  HostelIssueType
>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ReportIssueTab() {
  const queryClient = useQueryClient();
  const structureQuery = useQuery({ queryKey: ['hostel-warden', 'blocks'], queryFn: listHostelStructure });

  const [blockName, setBlockName] = useState<string | null>(null);
  const [roomLabel, setRoomLabel] = useState<string | null>(null);
  const [issueTypeLabelValue, setIssueTypeLabelValue] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const blocks = structureQuery.data ?? [];
  const blockOptions = blocks.map((b) => b.name);
  const selectedBlock = blocks.find((b) => b.name === blockName) ?? null;
  const roomOptions = (selectedBlock?.rooms ?? []).map((r) => `Floor ${r.floorNo} · Room ${r.roomNo}`);
  const selectedRoom = selectedBlock?.rooms.find((r) => `Floor ${r.floorNo} · Room ${r.roomNo}` === roomLabel) ?? null;

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!issueTypeLabelValue) {
      setError('Select an issue type.');
      return;
    }
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are both required.');
      return;
    }

    setSubmitting(true);
    try {
      await createComplaint({
        issueType: LABEL_TO_ISSUE_TYPE[issueTypeLabelValue]!,
        subject: subject.trim(),
        description: description.trim(),
        blockId: selectedBlock?.id,
        roomId: selectedRoom?.id,
      });
      queryClient.invalidateQueries({ queryKey: COMPLAINTS_KEY });
      setBlockName(null);
      setRoomLabel(null);
      setIssueTypeLabelValue(null);
      setSubject('');
      setDescription('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the complaint.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, cardShadow]}>
        <View style={{ marginBottom: 16 }}>
          <SelectField
            label="Block (optional)"
            value={blockName}
            placeholder={structureQuery.isLoading ? 'Loading blocks…' : 'Select a block'}
            options={blockOptions}
            onSelect={(v) => {
              setBlockName(v);
              setRoomLabel(null);
            }}
            disabled={structureQuery.isLoading || blockOptions.length === 0}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <SelectField
            label="Room (optional)"
            value={roomLabel}
            placeholder={blockName ? 'Select a room' : 'Select a block first'}
            options={roomOptions}
            onSelect={setRoomLabel}
            disabled={!blockName || roomOptions.length === 0}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <SelectField
            label="Issue type"
            value={issueTypeLabelValue}
            placeholder="Select an issue type"
            options={ISSUE_TYPE_OPTIONS}
            onSelect={setIssueTypeLabelValue}
          />
        </View>

        <Field label="Subject">
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="e.g. Fan not working" placeholderTextColor={parentColors.mutedLight} />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue"
            placeholderTextColor={parentColors.mutedLight}
            multiline
          />
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Complaint submitted. Check the History tab.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit complaint</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab() {
  const router = useRouter();
  // Polls like the other approval screens (Gate Pass/Call/Emergency Exit) --
  // Principal can decide a complaint at any time while the Warden already has
  // this tab open.
  const listQuery = useQuery({ queryKey: COMPLAINTS_KEY, queryFn: listComplaints, refetchInterval: 15_000 });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
    >
      {listQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : listQuery.isError ? (
        <ErrorState message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load complaints.'} onRetry={() => listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState message="No complaints reported yet." />
      ) : (
        (listQuery.data ?? []).map((complaint) => {
          const meta = complaintStatusMeta(complaint.state);
          return (
            <Pressable
              key={complaint.id}
              style={[styles.card, cardShadow]}
              onPress={() => router.push(`/(protected)/hostel-warden/complaints/${complaint.id}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subject} numberOfLines={1}>
                    {complaint.subject}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {issueTypeLabel(complaint.issueType)} · {formatDate(complaint.createdAt)}
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

export default function ComplaintsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'report' | 'history'>('report');

  return (
    <View style={styles.flex}>
      <AppHeader title="Hostel Complaints" subtitle="Report and track maintenance issues" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'report', label: 'Report an issue' },
          { key: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'report' ? <ReportIssueTab /> : <HistoryTab />}
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
