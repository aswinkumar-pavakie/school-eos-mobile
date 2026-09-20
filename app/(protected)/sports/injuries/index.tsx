// Sports Admin -> Injuries & incidents. Real listInjuries()/createInjury()/
// updateInjury() -- see school-eos-backend migration
// 0023_sports_injuries.sql, same real endpoints the website Sports Admin
// console now uses. Replaces the earlier honest GapScreen stub now that the
// backend is live.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import {
  createInjury,
  INJURY_STATUSES,
  listInjuries,
  listSports,
  listStudents,
  updateInjury,
  type InjuryStatus,
} from '@/lib/sports-api';

const STATUS_LABEL: Record<InjuryStatus, string> = { UNDER_CARE: 'Under care', OBSERVATION: 'Observation', CLOSED: 'Closed' };

export default function InjuriesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLabel, setStudentLabel] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [guardianInformed, setGuardianInformed] = useState(false);

  const injuriesQuery = useQuery({ queryKey: ['sports-injuries'], queryFn: listInjuries });
  const sportsQuery = useQuery({ queryKey: ['sports-list'], queryFn: listSports, enabled: showAdd });
  const searchQuery = useQuery({
    queryKey: ['sports-student-search', query],
    queryFn: () => listStudents({ search: query }),
    enabled: query.trim().length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!studentId || !title.trim() || !incidentDate) throw new Error('Pick a student, add a title and the incident date.');
      return createInjury({
        studentId,
        sportId: sportId ?? undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        incidentDate,
        guardianInformed,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-injuries'] });
      setShowAdd(false);
      setStudentId(null);
      setStudentLabel('');
      setQuery('');
      setSportId(null);
      setTitle('');
      setDescription('');
      setIncidentDate('');
      setGuardianInformed(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InjuryStatus }) => updateInjury(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-injuries'] }),
  });

  const informMutation = useMutation({
    mutationFn: (id: string) => updateInjury(id, { guardianInformed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-injuries'] }),
  });

  const sorted = [...(injuriesQuery.data ?? [])].sort((a, b) => new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime());

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Injuries & incidents" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Record incident'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Student</Text>
            <TextInput
              value={studentId ? studentLabel : query}
              onChangeText={(t) => { setStudentId(null); setQuery(t); }}
              placeholder="Search by name or admission no."
              placeholderTextColor={sportsColors.faint}
              style={styles.input}
            />
            {!studentId && (searchQuery.data?.data.length ?? 0) > 0 ? (
              <View>
                {searchQuery.data!.data.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.resultRow}
                    onPress={() => { setStudentId(s.id); setStudentLabel(`${s.firstName} ${s.lastName ?? ''}`.trim()); }}
                  >
                    <Text style={styles.resultName}>{s.firstName} {s.lastName ?? ''}</Text>
                    <Text style={styles.resultMeta}>{s.admissionNo}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.label}>Sport (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(sportsQuery.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => setSportId(sportId === s.id ? null : s.id)} style={[styles.chip, sportId === s.id && styles.chipActive]}>
                  <Text style={[styles.chipText, sportId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Ankle sprain during practice" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="What happened" placeholderTextColor={sportsColors.faint} style={styles.input} multiline />
            <Text style={styles.label}>Incident date (YYYY-MM-DD)</Text>
            <TextInput value={incidentDate} onChangeText={setIncidentDate} placeholder="2026-09-18" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Pressable style={styles.checkRow} onPress={() => setGuardianInformed((v) => !v)}>
              <View style={[styles.checkbox, guardianInformed && styles.checkboxActive]} />
              <Text style={styles.checkLabel}>Guardian already informed</Text>
            </Pressable>
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Record incident'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Incident register</Text>
          <Text style={styles.count}>{sorted.length} case{sorted.length === 1 ? '' : 's'}</Text>
        </View>

        {sorted.length === 0 ? (
          <EmptyPanel label="No injuries or incidents recorded yet." />
        ) : (
          sorted.map((i) => (
            <Card key={i.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{i.title}</Text>
                  <Text style={styles.rowSub}>
                    {i.studentFirstName} {i.studentLastName ?? ''}
                    {i.gradeName ? ` · ${i.gradeName}${i.sectionName ? ' ' + i.sectionName : ''}` : ''}
                  </Text>
                </View>
                <StatusPill label={STATUS_LABEL[i.status].toLowerCase()} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Date</Text>
                  <Text style={styles.metaValue}>{new Date(i.incidentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Guardian</Text>
                  <Text style={styles.metaValue}>{i.guardianInformed ? 'Informed' : 'Not informed'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {!i.guardianInformed ? (
                  <Pressable
                    disabled={informMutation.isPending}
                    onPress={() => informMutation.mutate(i.id)}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>Inform guardian</Text>
                  </Pressable>
                ) : null}
                {INJURY_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    disabled={statusMutation.isPending}
                    onPress={() => s !== i.status && statusMutation.mutate({ id: i.id, status: s })}
                    style={[styles.chip, i.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, i.status === s && styles.chipTextActive]}>{STATUS_LABEL[s]}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  addButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: sportsColors.tertiary },
  input: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: sportsColors.ink },
  resultRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft },
  resultName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  resultMeta: { fontSize: 12, color: sportsColors.muted, marginTop: 2 },
  chip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  chipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: sportsColors.inputBorder },
  checkboxActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  checkLabel: { fontSize: 13, color: sportsColors.bodyStrong },
  error: { fontSize: 12.5, color: sportsColors.red },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingTop: 2 },
  title: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  count: { fontSize: 11.5, color: sportsColors.tertiary },
  rowCard: { gap: 12, padding: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, lineHeight: 19 },
  rowSub: { fontSize: 12.5, color: sportsColors.mutedStrong },
  metaBlock: { gap: 7, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, paddingTop: 11 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaKey: { flex: 1, fontSize: 12, color: sportsColors.tertiary },
  metaValue: { flex: 1.2, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong, textAlign: 'right' },
});
