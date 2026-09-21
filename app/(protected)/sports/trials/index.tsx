// Sports Admin -> Trials & selection. Real listTrials()/createTrial()/
// updateTrial() -- see school-eos-backend migration 0022_sports_trials.sql,
// same real endpoints the website Sports Admin console now uses. Replaces
// the earlier honest GapScreen stub now that the backend is live.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import {
  createTrial,
  listSports,
  listStudents,
  listTrials,
  TRIAL_ROUNDS,
  TRIAL_STATUSES,
  updateTrial,
  type TrialRound,
  type TrialStatus,
} from '@/lib/sports-api';

const ROUND_LABEL: Record<TrialRound, string> = { ROUND_1: 'Round 1', ROUND_2: 'Round 2', FINAL_ROUND: 'Final round' };
const STATUS_LABEL: Record<TrialStatus, string> = { PENDING: 'Pending', HOLD: 'Hold', SELECTED: 'Selected', NOT_SELECTED: 'Not selected' };

export default function TrialsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLabel, setStudentLabel] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [round, setRound] = useState<TrialRound>('ROUND_1');
  const [trialDate, setTrialDate] = useState('');
  const [score, setScore] = useState('');

  const trialsQuery = useQuery({ queryKey: ['sports-trials'], queryFn: listTrials });
  const sportsQuery = useQuery({ queryKey: ['sports-list'], queryFn: listSports, enabled: showAdd });
  const searchQuery = useQuery({
    queryKey: ['sports-student-search', query],
    queryFn: () => listStudents({ search: query }),
    enabled: query.trim().length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!studentId || !sportId || !trialDate) throw new Error('Pick a candidate, sport and trial date.');
      return createTrial({ studentId, sportId, round, trialDate, score: score.trim() || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-trials'] });
      setShowAdd(false);
      setStudentId(null);
      setStudentLabel('');
      setQuery('');
      setSportId(null);
      setRound('ROUND_1');
      setTrialDate('');
      setScore('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrialStatus }) => updateTrial(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-trials'] }),
  });

  const sorted = [...(trialsQuery.data ?? [])].sort((a, b) => new Date(b.trialDate).getTime() - new Date(a.trialDate).getTime());

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Trials & selection" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={undefined}
      >
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Schedule trial'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Candidate</Text>
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
            <Text style={styles.label}>Round</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TRIAL_ROUNDS.map((r) => (
                <Pressable key={r} onPress={() => setRound(r)} style={[styles.chip, round === r && styles.chipActive]}>
                  <Text style={[styles.chipText, round === r && styles.chipTextActive]}>{ROUND_LABEL[r]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Trial date (YYYY-MM-DD)</Text>
            <TextInput value={trialDate} onChangeText={setTrialDate} placeholder="2026-10-12" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Score (optional)</Text>
            <TextInput value={score} onChangeText={setScore} placeholder="12.4s, 8/10" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Schedule trial'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Trial register</Text>
          <Text style={styles.count}>{sorted.length} trial{sorted.length === 1 ? '' : 's'}</Text>
        </View>

        {sorted.length === 0 ? (
          <EmptyPanel label="No trials scheduled yet." />
        ) : (
          sorted.map((t) => (
            <Card key={t.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{t.studentFirstName} {t.studentLastName ?? ''}</Text>
                  <Text style={styles.rowSub}>
                    {t.gradeName ? `${t.gradeName}${t.sectionName ? ' ' + t.sectionName : ''} · ` : ''}
                    {t.sportName} · {ROUND_LABEL[t.round]}
                  </Text>
                </View>
                <StatusPill label={STATUS_LABEL[t.status].toLowerCase()} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Trial date</Text>
                  <Text style={styles.metaValue}>{new Date(t.trialDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Score</Text>
                  <Text style={styles.metaValue}>{t.score ?? '—'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {TRIAL_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    disabled={statusMutation.isPending}
                    onPress={() => s !== t.status && statusMutation.mutate({ id: t.id, status: s })}
                    style={[styles.chip, t.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, t.status === s && styles.chipTextActive]}>{STATUS_LABEL[s]}</Text>
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
