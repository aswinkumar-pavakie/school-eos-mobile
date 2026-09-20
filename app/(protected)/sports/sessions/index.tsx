// Sports Admin -> Training sessions. Real listTrainingSessions() +
// listMyTeams()/listCoaches() for the create form -- same backend the
// website's own Sessions screen uses.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, SportsSubHeader } from '@/components/sports/primitives';
import { RegisterList, type RegisterRow } from '@/components/sports/RegisterList';
import { createTrainingSession, listCoaches, listMyTeams, listTrainingSessions } from '@/lib/sports-api';

export default function SessionsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [focus, setFocus] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  const sessionsQuery = useQuery({ queryKey: ['sports-sessions'], queryFn: listTrainingSessions });
  const teamsQuery = useQuery({ queryKey: ['sports-teams'], queryFn: listMyTeams, enabled: showAdd });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!teamId || !dateStr || !timeStr) throw new Error('Pick a squad, date and time.');
      return createTrainingSession({ teamId, scheduledAt: new Date(`${dateStr}T${timeStr}`).toISOString(), venue: venue || undefined, focus: focus || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-sessions'] });
      setShowAdd(false);
      setTeamId(null);
      setVenue('');
      setFocus('');
      setDateStr('');
      setTimeStr('');
    },
  });

  const sorted = [...(sessionsQuery.data ?? [])].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  const rows: RegisterRow[] = sorted.map((s) => {
    const dt = new Date(s.scheduledAt);
    return {
      key: s.id,
      title: `${s.focus ?? 'Training'} — ${s.teamName}`,
      sub: s.venue ?? undefined,
      status: s.status.toLowerCase(),
      metas: [
        { k: 'Time', v: dt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) },
      ],
    };
  });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Training sessions" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ New session'}</Text>
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
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput value={dateStr} onChangeText={setDateStr} placeholder="2026-09-20" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Time (HH:MM)</Text>
            <TextInput value={timeStr} onChangeText={setTimeStr} placeholder="15:00" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Venue</Text>
            <TextInput value={venue} onChangeText={setVenue} placeholder="Main ground" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Focus</Text>
            <TextInput value={focus} onChangeText={setFocus} placeholder="Fitness & drills" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save session'}</Text>
            </Pressable>
          </Card>
        ) : null}
        <RegisterList title="Sessions" countLabel={`${sorted.length} sessions`} rows={rows} emptyLabel="No training sessions scheduled yet." refreshing={sessionsQuery.isFetching} onRefresh={() => sessionsQuery.refetch()} />
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
});
