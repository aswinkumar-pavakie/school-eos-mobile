// Health In-charge -- record a new infirmary visit. Same plain-validated-field
// form shape as hostel-warden/study-sessions/create.tsx (no date-picker
// dependency in this app; enum fields use the shared SelectField, same as
// hostel-warden/complaints' own "Report an issue" tab), student lookup via a
// live search against GET /health-incharge/students (search=), matching the
// backend contract the website's own RecordVisitModal already uses.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HealthSubHeader } from '@/components/health-incharge/primitives';
import { SelectField } from '@/components/SelectField';
import { ApiError } from '@/lib/api';
import {
  createHealthVisit,
  searchHealthStudents,
  studentName,
  classLabel,
  VISIT_ACTIONS,
  ACTION_LABEL,
  SERIOUS_ACTIONS,
  type StudentLookup,
} from '@/lib/health-incharge-api';
import { healthInchargeColors } from '@/lib/theme';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function CreateVisitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [student, setStudent] = useState<StudentLookup | null>(null);
  const [complaint, setComplaint] = useState('');
  const [tempC, setTempC] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [bp, setBp] = useState('');
  const [observation, setObservation] = useState('');
  const [action, setAction] = useState<(typeof VISIT_ACTIONS)[number] | null>(null);
  const [outcome, setOutcome] = useState('');
  const [notifyParent, setNotifyParent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: ['health-incharge-student-search', search],
    queryFn: () => searchHealthStudents(search.trim()),
    enabled: !student && search.trim().length >= 2,
  });

  function pickAction(label: string) {
    const code = VISIT_ACTIONS.find((a) => (ACTION_LABEL[a] ?? a) === label);
    if (!code) return;
    setAction(code);
    setNotifyParent(SERIOUS_ACTIONS.includes(code));
  }

  async function handleSubmit() {
    setError(null);
    if (!student) {
      setError('Search and select a student.');
      return;
    }
    if (!complaint.trim()) {
      setError('Enter the complaint.');
      return;
    }
    if (!action) {
      setError('Choose an action taken.');
      return;
    }
    const vitals: { temp_c?: number; pulse?: number; spo2?: number; bp?: string } = {};
    if (tempC.trim()) vitals.temp_c = Number(tempC.trim());
    if (pulse.trim()) vitals.pulse = Number(pulse.trim());
    if (spo2.trim()) vitals.spo2 = Number(spo2.trim());
    if (bp.trim()) vitals.bp = bp.trim();

    setSubmitting(true);
    try {
      await createHealthVisit({
        studentId: student.studentId,
        complaint: complaint.trim(),
        vitals: Object.keys(vitals).length ? vitals : undefined,
        observation: observation.trim() || undefined,
        action,
        outcome: outcome.trim() || undefined,
        notifyParent,
      });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-visits'] });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the visit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <HealthSubHeader title="Record a visit" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Field label="Student">
            {student ? (
              <View style={styles.selectedStudent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedName}>{studentName(student)}</Text>
                  <Text style={styles.selectedSub}>{student.admissionNo} · {classLabel(student.gradeName, student.sectionName)}</Text>
                </View>
                <Pressable onPress={() => { setStudent(null); setSearch(''); }}>
                  <Text style={styles.changeLink}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by name or admission no."
                  placeholderTextColor={healthInchargeColors.muted}
                />
                {searchQuery.isLoading ? <ActivityIndicator color={healthInchargeColors.primary} style={{ marginTop: 10 }} /> : null}
                {searchQuery.data && searchQuery.data.length > 0 ? (
                  <View style={styles.resultList}>
                    {searchQuery.data.map((s) => (
                      <Pressable key={s.studentId} style={styles.resultRow} onPress={() => setStudent(s)}>
                        <Text style={styles.resultName}>{studentName(s)}</Text>
                        <Text style={styles.resultSub}>{s.admissionNo} · {classLabel(s.gradeName, s.sectionName)}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </Field>

          <Field label="Complaint">
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={complaint}
              onChangeText={setComplaint}
              placeholder="What brought them in"
              placeholderTextColor={healthInchargeColors.muted}
              multiline
            />
          </Field>

          <Field label="Vitals (optional)">
            <View style={styles.vitalsRow}>
              <TextInput style={[styles.input, styles.vitalsInput]} value={tempC} onChangeText={setTempC} placeholder="Temp °C" placeholderTextColor={healthInchargeColors.muted} keyboardType="decimal-pad" />
              <TextInput style={[styles.input, styles.vitalsInput]} value={pulse} onChangeText={setPulse} placeholder="Pulse" placeholderTextColor={healthInchargeColors.muted} keyboardType="number-pad" />
            </View>
            <View style={[styles.vitalsRow, { marginTop: 10 }]}>
              <TextInput style={[styles.input, styles.vitalsInput]} value={spo2} onChangeText={setSpo2} placeholder="SpO2 %" placeholderTextColor={healthInchargeColors.muted} keyboardType="number-pad" />
              <TextInput style={[styles.input, styles.vitalsInput]} value={bp} onChangeText={setBp} placeholder="BP e.g. 110/70" placeholderTextColor={healthInchargeColors.muted} />
            </View>
          </Field>

          <Field label="Observation (optional)">
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={observation}
              onChangeText={setObservation}
              placeholder="What was observed"
              placeholderTextColor={healthInchargeColors.muted}
              multiline
            />
          </Field>

          <Field label="Action taken">
            <SelectField
              label=""
              value={action ? (ACTION_LABEL[action] ?? action) : null}
              placeholder="Choose an action"
              options={VISIT_ACTIONS.map((a) => ACTION_LABEL[a] ?? a)}
              onSelect={pickAction}
            />
          </Field>

          <Field label="Outcome (optional)">
            <TextInput
              style={styles.input}
              value={outcome}
              onChangeText={setOutcome}
              placeholder="e.g. Returned to class"
              placeholderTextColor={healthInchargeColors.muted}
            />
          </Field>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Notify parent now</Text>
              <Text style={styles.switchHint}>Defaults on for sent-home / referred / sickbay-admit visits.</Text>
            </View>
            <Switch value={notifyParent} onValueChange={setNotifyParent} trackColor={{ true: healthInchargeColors.primary }} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Record visit</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: healthInchargeColors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: healthInchargeColors.border },
  fieldLabel: { fontSize: 13, color: healthInchargeColors.body, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: healthInchargeColors.inputBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: healthInchargeColors.ink,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  vitalsRow: { flexDirection: 'row', gap: 10 },
  vitalsInput: { flex: 1 },
  selectedStudent: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: healthInchargeColors.selectedBorder, backgroundColor: healthInchargeColors.tint, borderRadius: 12, padding: 12 },
  selectedName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  selectedSub: { fontSize: 12, color: healthInchargeColors.muted, marginTop: 2 },
  changeLink: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.primary },
  resultList: { marginTop: 8, borderWidth: 1, borderColor: healthInchargeColors.border, borderRadius: 12, overflow: 'hidden' },
  resultRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: healthInchargeColors.borderSoft },
  resultName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  resultSub: { fontSize: 12, color: healthInchargeColors.muted, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  switchHint: { fontSize: 11.5, color: healthInchargeColors.muted, marginTop: 3, lineHeight: 16 },
  error: { color: healthInchargeColors.red, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: healthInchargeColors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
