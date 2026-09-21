// Sports Admin -> Substitute Coach. Real listSubstituteCoaches()/
// createSubstituteCoach() -- POST/PATCH/DELETE /sports/substitute-coaches, a
// genuine backend gap confirmed by audit and built new for this feature
// (see migration 0026_sports_practice_results_selection_substitute.sql).
// Deliberately its own entity, distinct from team.coach_id (a single
// overwritable field with no time-boxed coverage concept at all).

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { createSubstituteCoach, listCoaches, listMyTeams, listSubstituteCoaches, updateSubstituteCoach, type SubstituteCoachStatus } from '@/lib/sports-api';

const STATUS_LABEL: Record<SubstituteCoachStatus, string> = { PENDING: 'pending', APPROVED: 'approved', CLOSED: 'closed' };

export default function SubstituteCoachScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [substituteCoachId, setSubstituteCoachId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const rowsQuery = useQuery({ queryKey: ['sports-substitute-coaches'], queryFn: listSubstituteCoaches });
  const teamsQuery = useQuery({ queryKey: ['sports-teams'], queryFn: listMyTeams, enabled: showAdd });
  const coachesQuery = useQuery({ queryKey: ['sports-coaches'], queryFn: listCoaches, enabled: showAdd });

  const selectedTeam = (teamsQuery.data ?? []).find((t) => t.id === teamId);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!teamId || !substituteCoachId || !startDate || !endDate) throw new Error('Pick a squad, a substitute coach and dates.');
      return createSubstituteCoach({
        teamId,
        originalCoachId: selectedTeam?.coachId ?? undefined,
        substituteCoachId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-substitute-coaches'] });
      setShowAdd(false);
      setTeamId(null);
      setSubstituteCoachId(null);
      setStartDate('');
      setEndDate('');
      setReason('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubstituteCoachStatus }) => updateSubstituteCoach(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-substitute-coaches'] }),
  });

  const sorted = [...(rowsQuery.data ?? [])].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Substitute coach" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Assign cover'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Squad</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(teamsQuery.data ?? []).map((t) => (
                <Pressable key={t.id} onPress={() => setTeamId(t.id)} style={[styles.chip, teamId === t.id && styles.chipActive]}>
                  <Text style={[styles.chipText, teamId === t.id && styles.chipTextActive]}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Substitute coach</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(coachesQuery.data ?? []).filter((c) => c.id !== selectedTeam?.coachId).map((c) => (
                <Pressable key={c.id} onPress={() => setSubstituteCoachId(c.id)} style={[styles.chip, substituteCoachId === c.id && styles.chipActive]}>
                  <Text style={[styles.chipText, substituteCoachId === c.id && styles.chipTextActive]}>{c.fullName}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="2026-10-06" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="2026-10-12" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Regular coach on leave" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Assign cover'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Assignments</Text>
          <Text style={styles.count}>{sorted.length} assignment{sorted.length === 1 ? '' : 's'}</Text>
        </View>
        {sorted.length === 0 ? (
          <EmptyPanel label="No substitute-coach assignments yet." />
        ) : (
          sorted.map((r) => (
            <Card key={r.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{r.teamName}</Text>
                  <Text style={styles.rowSub}>{r.substituteCoachName} covering{r.originalCoachName ? ` for ${r.originalCoachName}` : ''}</Text>
                </View>
                <StatusPill label={STATUS_LABEL[r.status]} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Cover dates</Text>
                  <Text style={styles.metaValue}>{r.startDate} → {r.endDate}</Text>
                </View>
                {r.reason ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Reason</Text>
                    <Text style={styles.metaValue}>{r.reason}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {(['PENDING', 'APPROVED', 'CLOSED'] as SubstituteCoachStatus[]).map((s) => (
                  <Pressable
                    key={s}
                    disabled={statusMutation.isPending}
                    onPress={() => s !== r.status && statusMutation.mutate({ id: r.id, status: s })}
                    style={[styles.chip, r.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, r.status === s && styles.chipTextActive]}>{STATUS_LABEL[s]}</Text>
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
