// Health In-charge -- one student's full health record: GET
// /health-incharge/students/:id returns profile + consents + visits +
// escalations together in one call (StudentHealth), matching the website's
// own student detail page exactly. Profile is edited via PUT (upsert --
// an empty field clears it, same as the backend DTO's own comment says).

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HealthSubHeader, Card, StatusPill, SectionLabel, EmptyPanel } from '@/components/health-incharge/primitives';
import { SelectField } from '@/components/SelectField';
import { ApiError } from '@/lib/api';
import { getStudentHealth, saveHealthProfile, ACTION_LABEL, BLOOD_GROUPS, CHANNEL_LABEL } from '@/lib/health-incharge-api';
import { formatDate, formatDateTime } from '@/lib/format';
import { healthInchargeColors } from '@/lib/theme';

export default function StudentHealthScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['health-incharge-student', id], queryFn: () => getStudentHealth(id) });
  const [editing, setEditing] = useState(false);
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [familyDoctor, setFamilyDoctor] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <View style={styles.flex}>
        <HealthSubHeader title="Student health" onBack={() => router.back()} />
        <ActivityIndicator color={healthInchargeColors.primary} style={{ marginTop: 30 }} />
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.flex}>
        <HealthSubHeader title="Student health" onBack={() => router.back()} />
        <EmptyPanel label="Couldn't load this student's record." />
      </View>
    );
  }

  const { student, profile, consents, visits, escalations } = query.data;

  function startEdit() {
    setBloodGroup(profile?.bloodGroup ?? null);
    setFamilyDoctor(profile?.familyDoctor ?? '');
    setDoctorPhone(profile?.doctorPhone ?? '');
    setNotes(profile?.notes ?? '');
    setEditing(true);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveHealthProfile(id, {
        bloodGroup: (bloodGroup as (typeof BLOOD_GROUPS)[number]) ?? null,
        familyDoctor: familyDoctor.trim() || null,
        doctorPhone: doctorPhone.trim() || null,
        notes: notes.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ['health-incharge-student', id] });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.flex}>
      <HealthSubHeader title={[student.firstName, student.lastName].filter(Boolean).join(' ')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subLine}>{student.admissionNo} · {student.gradeName ? `${student.gradeName}${student.sectionName ? `-${student.sectionName}` : ''}` : '—'}</Text>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <SectionLabel>HEALTH PROFILE</SectionLabel>
            {!editing ? (
              <Pressable onPress={startEdit}>
                <Text style={styles.editLink}>{profile ? 'Edit' : 'Add'}</Text>
              </Pressable>
            ) : null}
          </View>
          {editing ? (
            <Card style={{ gap: 12, marginTop: 8 }}>
              <SelectField
                label="Blood group"
                value={bloodGroup}
                placeholder="Select"
                options={[...BLOOD_GROUPS]}
                onSelect={setBloodGroup}
              />
              <View>
                <Text style={styles.fieldLabel}>Family doctor</Text>
                <TextInput style={styles.input} value={familyDoctor} onChangeText={setFamilyDoctor} placeholderTextColor={healthInchargeColors.muted} />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Doctor phone</Text>
                <TextInput style={styles.input} value={doctorPhone} onChangeText={setDoctorPhone} keyboardType="phone-pad" placeholderTextColor={healthInchargeColors.muted} />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput style={[styles.input, styles.inputMultiline]} value={notes} onChangeText={setNotes} multiline placeholderTextColor={healthInchargeColors.muted} />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={[styles.smallButton, { flex: 1 }, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.smallButtonText}>Save</Text>}
                </Pressable>
                <Pressable style={[styles.smallButtonOutline, { flex: 1 }]} onPress={() => setEditing(false)}>
                  <Text style={styles.smallButtonOutlineText}>Cancel</Text>
                </Pressable>
              </View>
            </Card>
          ) : profile ? (
            <Card style={{ marginTop: 8, gap: 4 }}>
              <Text style={styles.rowTitle}>Blood group: {profile.bloodGroup ?? '—'}</Text>
              {profile.familyDoctor ? <Text style={styles.subLine}>Doctor: {profile.familyDoctor}{profile.doctorPhone ? ` · ${profile.doctorPhone}` : ''}</Text> : null}
              {profile.notes ? <Text style={styles.subLine}>{profile.notes}</Text> : null}
            </Card>
          ) : (
            <View style={{ marginTop: 8 }}>
              <EmptyPanel label="No health profile on file yet." />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>GUARDIAN CONSENTS</SectionLabel>
          {consents.length === 0 ? (
            <View style={{ marginTop: 8 }}>
              <EmptyPanel label="No consent on file." />
            </View>
          ) : (
            consents.map((c) => (
              <Card key={c.id} style={{ marginTop: 8 }}>
                <Text style={styles.rowTitle}>{c.scope}</Text>
                <Text style={styles.subLine}>
                  {[c.guardianFirstName, c.guardianLastName].filter(Boolean).join(' ') || 'Guardian'} · given {formatDate(c.consentGivenAt)}
                  {c.validUntil ? ` · valid until ${formatDate(c.validUntil)}` : ''}
                </Text>
              </Card>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>VISIT HISTORY</SectionLabel>
          {visits.length === 0 ? (
            <View style={{ marginTop: 8 }}>
              <EmptyPanel label="No infirmary visits recorded." />
            </View>
          ) : (
            visits.map((v) => (
              <Card key={v.id} style={styles.rowCard} onPress={() => router.push(`/(protected)/health-incharge/visits/${v.id}` as never)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{v.complaint}</Text>
                  <Text style={styles.subLine}>{formatDateTime(v.visitedAt)}</Text>
                </View>
                <StatusPill label={ACTION_LABEL[v.action] ?? v.action} />
              </Card>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>CONTACT HISTORY</SectionLabel>
          {escalations.length === 0 ? (
            <View style={{ marginTop: 8 }}>
              <EmptyPanel label="No parent/doctor contact logged." />
            </View>
          ) : (
            escalations.map((e) => (
              <Card key={e.id} style={{ marginTop: 8 }}>
                <Text style={styles.rowTitle}>{e.contactedName ?? 'Contact'} · {e.channel ? CHANNEL_LABEL[e.channel] ?? e.channel : '—'}</Text>
                <Text style={styles.subLine}>{formatDateTime(e.contactedAt)}</Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  subLine: { fontSize: 12.5, color: healthInchargeColors.muted },
  section: { gap: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editLink: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.primary },
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
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  smallButton: { backgroundColor: healthInchargeColors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  smallButtonOutline: { borderWidth: 1, borderColor: healthInchargeColors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  smallButtonOutlineText: { color: healthInchargeColors.primary, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold' },
  disabled: { opacity: 0.6 },
  smallButtonText: { color: '#fff', fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold' },
  error: { color: healthInchargeColors.red, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
});
