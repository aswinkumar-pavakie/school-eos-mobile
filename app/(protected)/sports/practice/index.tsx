// Sports Admin -> Practice Plan. Real listPracticePlans()/
// createPracticePlan() -- POST/PATCH/DELETE /sports/practice-plans, a
// genuine backend gap confirmed by audit and built new for this feature
// (see migration 0026_sports_practice_results_selection_substitute.sql).
// Deliberately its own entity, not a Training Sessions view -- a forward
// weekly plan for a squad, distinct from day-of schedule/attendance.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { createPracticePlan, listMyTeams, listPracticePlans, updatePracticePlan, WEEKDAYS, type PracticePlanStatus, type Weekday } from '@/lib/sports-api';

const STATUS_LABEL: Record<PracticePlanStatus, string> = { ACTIVE: 'active', DRAFT: 'draft', ARCHIVED: 'archived' };

export default function PracticePlanScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [focusDay, setFocusDay] = useState<Weekday>('MONDAY');
  const [weeklyFocus, setWeeklyFocus] = useState<Partial<Record<Weekday, string>>>({});
  const [focusText, setFocusText] = useState('');

  const plansQuery = useQuery({ queryKey: ['sports-practice-plans'], queryFn: listPracticePlans });
  const teamsQuery = useQuery({ queryKey: ['sports-teams'], queryFn: listMyTeams, enabled: showAdd });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!teamId || !title.trim() || !startDate || !endDate) throw new Error('Pick a squad, title and date range.');
      return createPracticePlan({ teamId, title: title.trim(), startDate, endDate, weeklyFocus });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-practice-plans'] });
      setShowAdd(false);
      setTeamId(null);
      setTitle('');
      setStartDate('');
      setEndDate('');
      setWeeklyFocus({});
      setFocusText('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PracticePlanStatus }) => updatePracticePlan(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-practice-plans'] }),
  });

  const sorted = [...(plansQuery.data ?? [])].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Practice plan" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ New plan'}</Text>
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
            <Text style={styles.label}>Plan title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Pre-season conditioning" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="2026-10-06" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="2026-10-12" placeholderTextColor={sportsColors.faint} style={styles.input} />

            <Text style={styles.label}>Weekly focus (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WEEKDAYS.map((d) => (
                <Pressable key={d} onPress={() => { setFocusDay(d); setFocusText(weeklyFocus[d] ?? ''); }} style={[styles.chip, focusDay === d && styles.chipActive]}>
                  <Text style={[styles.chipText, focusDay === d && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={focusText}
              onChangeText={(t) => { setFocusText(t); setWeeklyFocus((prev) => ({ ...prev, [focusDay]: t })); }}
              placeholder={`Focus for ${focusDay.charAt(0)}${focusDay.slice(1).toLowerCase()}`}
              placeholderTextColor={sportsColors.faint}
              style={styles.input}
            />

            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Create plan'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Plans</Text>
          <Text style={styles.count}>{sorted.length} plan{sorted.length === 1 ? '' : 's'}</Text>
        </View>
        {sorted.length === 0 ? (
          <EmptyPanel label="No practice plans yet." />
        ) : (
          sorted.map((p) => (
            <Card key={p.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{p.title}</Text>
                  <Text style={styles.rowSub}>{p.teamName} · {p.sportName}</Text>
                </View>
                <StatusPill label={STATUS_LABEL[p.status]} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Dates</Text>
                  <Text style={styles.metaValue}>{p.startDate} → {p.endDate}</Text>
                </View>
                {Object.entries(p.weeklyFocus).map(([day, focus]) => (
                  <View key={day} style={styles.metaRow}>
                    <Text style={styles.metaKey}>{day.slice(0, 3)}</Text>
                    <Text style={styles.metaValue}>{focus}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {(['DRAFT', 'ACTIVE', 'ARCHIVED'] as PracticePlanStatus[]).map((s) => (
                  <Pressable
                    key={s}
                    disabled={statusMutation.isPending}
                    onPress={() => s !== p.status && statusMutation.mutate({ id: p.id, status: s })}
                    style={[styles.chip, p.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, p.status === s && styles.chipTextActive]}>{STATUS_LABEL[s]}</Text>
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
