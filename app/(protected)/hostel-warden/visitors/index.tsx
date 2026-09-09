// Visitor Log -- two tabs: "Record visit" (entry form) and "History" (past +
// current visits). Duplicate exit is safe on the backend (a 0-row conditional
// UPDATE, not an error) -- History relies on that: tapping "Mark exit" twice just
// re-shows the same exitedAt, never a duplicate-action error.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { createVisitor, exitVisitor, listRoomAllocations, listVisitors, type HostelAllocationRow } from '@/lib/hostel-warden-api';
import { fullName, visitorStatusMeta } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

const VISITORS_KEY = ['hostel-warden', 'visitors'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function RecordVisitTab() {
  const queryClient = useQueryClient();
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<HostelAllocationRow | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const searchResults = useMemo(() => {
    if (selectedStudent || studentSearch.trim().length < 2) return [];
    const q = studentSearch.trim().toLowerCase();
    return (allocationsQuery.data ?? [])
      .filter(
        (row) =>
          fullName(row.studentFirstName, row.studentLastName).toLowerCase().includes(q) ||
          row.admissionNo.toLowerCase().includes(q) ||
          (row.rollNo !== null && String(row.rollNo).includes(q)),
      )
      .slice(0, 8);
  }, [allocationsQuery.data, studentSearch, selectedStudent]);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!selectedStudent) {
      setError('Search and select the student being visited.');
      return;
    }
    if (!visitorName.trim()) {
      setError('Visitor name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await createVisitor({
        studentId: selectedStudent.studentId,
        visitorName: visitorName.trim(),
        relationship: relationship.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: VISITORS_KEY });
      setSelectedStudent(null);
      setVisitorName('');
      setRelationship('');
      setPhone('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the visitor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, cardShadow]}>
        <Field label="Student">
          {selectedStudent ? (
            <View style={styles.selectedStudent}>
              <Text style={styles.selectedStudentText}>
                {fullName(selectedStudent.studentFirstName, selectedStudent.studentLastName)} · {selectedStudent.admissionNo}
              </Text>
              <Pressable onPress={() => setSelectedStudent(null)}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="Search by name, admission no. or roll no."
                placeholderTextColor={parentColors.mutedLight}
              />
              {allocationsQuery.isLoading ? <ActivityIndicator color={parentColors.blue} style={{ marginTop: 8 }} /> : null}
              {searchResults.map((row) => (
                <Pressable
                  key={row.studentId}
                  style={styles.resultRow}
                  onPress={() => {
                    setSelectedStudent(row);
                    setStudentSearch('');
                  }}
                >
                  <Text style={styles.resultText}>
                    {fullName(row.studentFirstName, row.studentLastName)} · {row.admissionNo}
                    {row.rollNo !== null ? ` · Roll ${row.rollNo}` : ''} · Room {row.roomNo}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
        </Field>

        <Field label="Visitor name">
          <TextInput style={styles.input} value={visitorName} onChangeText={setVisitorName} placeholder="e.g. Lakshmi Devi" placeholderTextColor={parentColors.mutedLight} />
        </Field>

        <Field label="Relation to student (optional)">
          <TextInput style={styles.input} value={relationship} onChangeText={setRelationship} placeholder="e.g. Mother" placeholderTextColor={parentColors.mutedLight} />
        </Field>

        <Field label="Phone (optional)">
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Contact number" placeholderTextColor={parentColors.mutedLight} keyboardType="phone-pad" />
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Visitor entry recorded. Check the History tab.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Record entry</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab() {
  const queryClient = useQueryClient();
  const [exitingId, setExitingId] = useState<string | null>(null);
  const listQuery = useQuery({ queryKey: VISITORS_KEY, queryFn: () => listVisitors() });

  const exitMutation = useMutation({
    mutationFn: (id: string) => exitVisitor(id),
    onMutate: (id) => setExitingId(id),
    onError: (err) => {
      Alert.alert('Could not mark exit', err instanceof ApiError ? err.message : 'Please try again.');
    },
    onSettled: () => {
      setExitingId(null);
      queryClient.invalidateQueries({ queryKey: VISITORS_KEY });
    },
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
    >
      {listQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : listQuery.isError ? (
        <ErrorState message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load visitor log.'} onRetry={() => listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState message="No visitors recorded yet." />
      ) : (
        (listQuery.data ?? []).map((visitor) => {
          const meta = visitorStatusMeta(visitor.exitedAt);
          const isExiting = exitMutation.isPending && exitingId === visitor.id;
          return (
            <View key={visitor.id} style={[styles.card, cardShadow]}>
              <View style={styles.cardTop}>
                <Avatar firstName={visitor.visitorName} lastName={null} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitorName} numberOfLines={1}>
                    {visitor.visitorName}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {visitor.relationship ? `${visitor.relationship} of ` : 'Visiting '}
                    {fullName(visitor.studentFirstName, visitor.studentLastName)}
                  </Text>
                </View>
                <StatusBadge label={meta.label} tone={meta.tone} />
              </View>
              <Text style={styles.meta}>Entered: {formatDateTime(visitor.enteredAt)}</Text>
              {visitor.exitedAt ? (
                <Text style={styles.meta}>Exited: {formatDateTime(visitor.exitedAt)}</Text>
              ) : (
                <Pressable style={styles.exitButton} onPress={() => exitMutation.mutate(visitor.id)} disabled={isExiting}>
                  {isExiting ? <ActivityIndicator color={parentColors.blue} size="small" /> : <Text style={styles.exitButtonText}>Mark exit</Text>}
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

export default function VisitorsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'record' | 'history'>('record');

  return (
    <View style={styles.flex}>
      <AppHeader title="Visitor Log" subtitle="Entry and exit for your hostel" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'record', label: 'Record visit' },
          { key: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'record' ? <RecordVisitTab /> : <HistoryTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
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
  selectedStudent: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    backgroundColor: '#F5F8FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedStudentText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, flex: 1, marginRight: 8 },
  changeLink: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  resultRow: { borderBottomWidth: 1, borderBottomColor: parentColors.borderSoft, paddingVertical: 11 },
  resultText: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  success: { color: '#1E8A4C', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  visitorName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  exitButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: parentColors.border,
    paddingHorizontal: 16,
  },
  exitButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, color: parentColors.ink },
});
