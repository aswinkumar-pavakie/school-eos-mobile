// Health In-charge -- visit detail. The backend has no GET /health-incharge/
// visits/:id (only GET /visits, list) -- see health-incharge.controller.ts --
// so this reads the same row out of the list query's own cache (queryKey
// ['health-incharge-visits','all'], the exact key the Visits list screen
// already populates when this screen is pushed from it) rather than adding a
// client-only re-fetch-by-id shape the backend doesn't have.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HealthSubHeader, Card, StatusPill, SectionLabel, EmptyPanel } from '@/components/health-incharge/primitives';
import { SelectField } from '@/components/SelectField';
import { ApiError } from '@/lib/api';
import {
  listHealthVisits,
  listHealthEscalations,
  updateHealthVisit,
  notifyVisitParent,
  createHealthEscalation,
  studentName,
  classLabel,
  ACTION_LABEL,
  CHANNEL_LABEL,
  ESCALATION_CHANNELS,
  VISIT_ACTIONS,
} from '@/lib/health-incharge-api';
import { formatDateTime } from '@/lib/format';
import { healthInchargeColors } from '@/lib/theme';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const visitsQuery = useQuery({ queryKey: ['health-incharge-visits', 'all'], queryFn: () => listHealthVisits({}) });
  const visit = visitsQuery.data?.find((v) => v.id === id);

  const escalationsQuery = useQuery({
    queryKey: ['health-incharge-escalations', visit?.studentId],
    queryFn: () => listHealthEscalations(visit!.studentId),
    enabled: !!visit,
  });
  const visitEscalations = escalationsQuery.data?.filter((e) => e.sourceId === id) ?? [];

  const [observation, setObservation] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [action, setAction] = useState<(typeof VISIT_ACTIONS)[number] | null>(null);
  const [savingField, setSavingField] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const [contactName, setContactName] = useState('');
  const [channel, setChannel] = useState<(typeof ESCALATION_CHANNELS)[number] | null>(null);
  const [response, setResponse] = useState('');
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (visitsQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <HealthSubHeader title="Visit" onBack={() => router.back()} />
        <ActivityIndicator color={healthInchargeColors.primary} style={{ marginTop: 30 }} />
      </View>
    );
  }
  if (!visit) {
    return (
      <View style={styles.flex}>
        <HealthSubHeader title="Visit" onBack={() => router.back()} />
        <EmptyPanel label="Couldn't find that visit -- go back and open it from the list again." />
      </View>
    );
  }

  async function saveUpdate() {
    if (observation === null && outcome === null && action === null) return;
    setSavingField(true);
    setError(null);
    try {
      await updateHealthVisit(visit!.id, {
        observation: observation ?? undefined,
        outcome: outcome ?? undefined,
        action: action ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-visits'] });
      setObservation(null);
      setOutcome(null);
      setAction(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSavingField(false);
    }
  }

  async function handleNotify() {
    setNotifying(true);
    setError(null);
    try {
      await notifyVisitParent(visit!.id);
      queryClient.invalidateQueries({ queryKey: ['health-incharge-visits'] });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-dashboard'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not notify the parent.');
    } finally {
      setNotifying(false);
    }
  }

  async function handleLogContact() {
    setError(null);
    if (!contactName.trim() || !channel) {
      setError('Enter who was contacted and how.');
      return;
    }
    setLogging(true);
    try {
      await createHealthEscalation({ visitId: visit!.id, contactedName: contactName.trim(), channel, response: response.trim() || undefined });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-escalations', visit!.studentId] });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-dashboard'] });
      setContactName('');
      setChannel(null);
      setResponse('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log the contact.');
    } finally {
      setLogging(false);
    }
  }

  return (
    <View style={styles.flex}>
      <HealthSubHeader title={studentName(visit)} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: 6 }}>
          <View style={styles.headRow}>
            <Text style={styles.subLine}>{classLabel(visit.gradeName, visit.sectionName)} · {visit.admissionNo}</Text>
            <StatusPill label={ACTION_LABEL[visit.action] ?? visit.action} />
          </View>
          <Text style={styles.subLine}>{formatDateTime(visit.visitedAt)}</Text>
          <Text style={styles.complaint}>{visit.complaint}</Text>
          {visit.vitals ? (
            <Text style={styles.vitals}>
              {[
                visit.vitals.temp_c != null ? `${visit.vitals.temp_c}°C` : null,
                visit.vitals.pulse != null ? `Pulse ${visit.vitals.pulse}` : null,
                visit.vitals.spo2 != null ? `SpO2 ${visit.vitals.spo2}%` : null,
                visit.vitals.bp ? `BP ${visit.vitals.bp}` : null,
              ].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <Text style={styles.subLine}>
            {visit.parentNotifiedAt ? `Parent notified ${formatDateTime(visit.parentNotifiedAt)}` : 'Parent not yet notified'}
          </Text>
          {!visit.parentNotifiedAt ? (
            <Pressable style={[styles.smallButton, notifying && styles.disabled]} onPress={handleNotify} disabled={notifying}>
              {notifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.smallButtonText}>Notify parent now</Text>}
            </Pressable>
          ) : null}
        </Card>

        <View style={styles.section}>
          <SectionLabel>UPDATE THIS VISIT</SectionLabel>
          <Card style={{ gap: 12, marginTop: 8 }}>
            <SelectField
              label="Action taken"
              value={ACTION_LABEL[action ?? visit.action] ?? (action ?? visit.action)}
              placeholder="Choose an action"
              options={VISIT_ACTIONS.map((a) => ACTION_LABEL[a] ?? a)}
              onSelect={(label) => setAction(VISIT_ACTIONS.find((a) => (ACTION_LABEL[a] ?? a) === label) ?? null)}
            />
            <View>
              <Text style={styles.fieldLabel}>Observation</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={observation ?? visit.observation ?? ''}
                onChangeText={setObservation}
                multiline
                placeholderTextColor={healthInchargeColors.muted}
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Outcome</Text>
              <TextInput
                style={styles.input}
                value={outcome ?? visit.outcome ?? ''}
                onChangeText={setOutcome}
                placeholderTextColor={healthInchargeColors.muted}
              />
            </View>
            <Pressable style={[styles.smallButton, savingField && styles.disabled]} onPress={saveUpdate} disabled={savingField}>
              {savingField ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.smallButtonText}>Save changes</Text>}
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel>PARENT & DOCTOR CONTACTS</SectionLabel>
          {visitEscalations.length === 0 ? (
            <View style={{ marginTop: 8 }}>
              <EmptyPanel label="No contact logged for this visit yet." />
            </View>
          ) : (
            visitEscalations.map((e) => (
              <Card key={e.id} style={{ marginTop: 8 }}>
                <Text style={styles.rowTitle}>{e.contactedName ?? 'Contact'} · {e.channel ? CHANNEL_LABEL[e.channel] ?? e.channel : '—'}</Text>
                <Text style={styles.subLine}>{formatDateTime(e.contactedAt)}</Text>
                {e.response ? <Text style={styles.complaint}>{e.response}</Text> : null}
              </Card>
            ))
          )}
          <Card style={{ gap: 12, marginTop: 10 }}>
            <Text style={styles.fieldLabel}>Log a new contact</Text>
            <TextInput
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Who was contacted"
              placeholderTextColor={healthInchargeColors.muted}
            />
            <SelectField
              label="Channel"
              value={channel ? (CHANNEL_LABEL[channel] ?? channel) : null}
              placeholder="How"
              options={ESCALATION_CHANNELS.map((c) => CHANNEL_LABEL[c] ?? c)}
              onSelect={(label) => setChannel(ESCALATION_CHANNELS.find((c) => (CHANNEL_LABEL[c] ?? c) === label) ?? null)}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={response}
              onChangeText={setResponse}
              placeholder="Response / notes (optional)"
              placeholderTextColor={healthInchargeColors.muted}
              multiline
            />
            <Pressable style={[styles.smallButton, logging && styles.disabled]} onPress={handleLogContact} disabled={logging}>
              {logging ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.smallButtonText}>Log contact</Text>}
            </Pressable>
          </Card>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subLine: { fontSize: 12.5, color: healthInchargeColors.muted },
  complaint: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: healthInchargeColors.ink, marginTop: 2 },
  vitals: { fontSize: 12.5, color: healthInchargeColors.body },
  section: { gap: 4 },
  fieldLabel: { fontSize: 13, color: healthInchargeColors.body, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: healthInchargeColors.inputBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: healthInchargeColors.ink,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  rowTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  smallButton: { backgroundColor: healthInchargeColors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  smallButtonText: { color: '#fff', fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold' },
  error: { color: healthInchargeColors.red, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
});
