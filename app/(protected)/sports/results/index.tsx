// Sports Admin -> Entry Results. Real listResultEntries()/
// createResultEntry() -- POST/PATCH/DELETE /sports/result-entries, a
// genuine backend gap confirmed by audit and built new for this feature
// (see migration 0026_sports_practice_results_selection_substitute.sql).
// Distinct from Fixture team-score results (already real, see
// /sports/fixtures) -- this is per-athlete, per-event. Once a result is
// entered here it can be pushed to PENDING for the Result Verification
// screen (same table, see substitutes/index.tsx's own sibling pattern).

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { createResultEntry, listResultEntries, listSports, listStudents, updateResultEntry, type ResultEntryStatus } from '@/lib/sports-api';

const STATUS_LABEL: Record<ResultEntryStatus, string> = { DRAFT: 'draft', PENDING: 'pending', VERIFIED: 'verified', REJECTED: 'rejected' };

export default function EntryResultsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLabel, setStudentLabel] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [resultValue, setResultValue] = useState('');
  const [position, setPosition] = useState('');

  const entriesQuery = useQuery({ queryKey: ['sports-result-entries'], queryFn: () => listResultEntries() });
  const sportsQuery = useQuery({ queryKey: ['sports-list'], queryFn: listSports, enabled: showAdd });
  const searchQuery = useQuery({
    queryKey: ['sports-student-search', query],
    queryFn: () => listStudents({ search: query }),
    enabled: query.trim().length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!studentId || !sportId || !eventName.trim() || !resultValue.trim()) throw new Error('Pick a student, sport, event and result.');
      return createResultEntry({ studentId, sportId, eventName: eventName.trim(), resultValue: resultValue.trim(), position: position.trim() || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-result-entries'] });
      setShowAdd(false);
      setStudentId(null);
      setStudentLabel('');
      setQuery('');
      setSportId(null);
      setEventName('');
      setResultValue('');
      setPosition('');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => updateResultEntry(id, { status: 'PENDING' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-result-entries'] }),
  });

  const sorted = [...(entriesQuery.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Entry results" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Enter result'}</Text>
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
            <Text style={styles.label}>Sport</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(sportsQuery.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => setSportId(s.id)} style={[styles.chip, sportId === s.id && styles.chipActive]}>
                  <Text style={[styles.chipText, sportId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Event</Text>
            <TextInput value={eventName} onChangeText={setEventName} placeholder="100m Sprint" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Result</Text>
            <TextInput value={resultValue} onChangeText={setResultValue} placeholder="12.4s, 8/10, 4.2m" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Position (optional)</Text>
            <TextInput value={position} onChangeText={setPosition} placeholder="1st" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Enter result'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Results</Text>
          <Text style={styles.count}>{sorted.length} entr{sorted.length === 1 ? 'y' : 'ies'}</Text>
        </View>
        {sorted.length === 0 ? (
          <EmptyPanel label="No results entered yet." />
        ) : (
          sorted.map((r) => (
            <Card key={r.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{r.studentFirstName} {r.studentLastName ?? ''}</Text>
                  <Text style={styles.rowSub}>{r.sportName} · {r.eventName}</Text>
                </View>
                <StatusPill label={STATUS_LABEL[r.status]} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Result</Text>
                  <Text style={styles.metaValue}>{r.resultValue}{r.position ? ` · ${r.position}` : ''}</Text>
                </View>
              </View>
              {r.status === 'DRAFT' ? (
                <Pressable disabled={submitMutation.isPending} style={styles.smallButton} onPress={() => submitMutation.mutate(r.id)}>
                  <Text style={styles.smallButtonText}>Submit for verification</Text>
                </Pressable>
              ) : null}
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
  smallButton: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  smallButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong },
});
