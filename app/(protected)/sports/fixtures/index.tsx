// Sports Admin -> Fixtures. Real listTournaments()/listFixtures() +
// listMyTeams() for team-name lookups and the create-fixture form -- same
// backend the website's Sports Admin console already uses.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, SportsSubHeader } from '@/components/sports/primitives';
import { RegisterList, type RegisterRow } from '@/components/sports/RegisterList';
import { createFixture, listFixtures, listMyTeams, listTournaments, recordFixtureResult } from '@/lib/sports-api';

export default function FixturesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  const tournamentsQuery = useQuery({ queryKey: ['sports-tournaments'], queryFn: listTournaments });
  const fixturesQuery = useQuery({ queryKey: ['sports-fixtures'], queryFn: listFixtures });
  const teamsQuery = useQuery({ queryKey: ['sports-teams'], queryFn: listMyTeams });

  const tournamentById = useMemo(() => new Map((tournamentsQuery.data ?? []).map((t) => [t.id, t])), [tournamentsQuery.data]);
  const teamById = useMemo(() => new Map((teamsQuery.data ?? []).map((t) => [t.id, t.name])), [teamsQuery.data]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!tournamentId || !dateStr || !timeStr) throw new Error('Pick a tournament, date and time.');
      return createFixture(tournamentId, {
        scheduledAt: new Date(`${dateStr}T${timeStr}`).toISOString(),
        venue: venue || undefined,
        homeTeamId: homeTeamId ?? undefined,
        awayTeamId: awayTeamId ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-fixtures'] });
      setShowAdd(false);
      setTournamentId(null);
      setHomeTeamId(null);
      setAwayTeamId(null);
      setVenue('');
      setDateStr('');
      setTimeStr('');
    },
  });

  const resultMutation = useMutation({
    mutationFn: ({ id, winnerTeamId }: { id: string; winnerTeamId: string }) => recordFixtureResult(id, { winnerTeamId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-fixtures'] }),
  });

  const sorted = [...(fixturesQuery.data ?? [])].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  const rows: RegisterRow[] = sorted.map((f) => {
    const t = tournamentById.get(f.tournamentId);
    const dt = new Date(f.scheduledAt);
    const home = f.homeTeamId ? teamById.get(f.homeTeamId) ?? '—' : '—';
    const away = f.awayTeamId ? teamById.get(f.awayTeamId) ?? '—' : '—';
    return {
      key: f.id,
      title: `${home} vs ${away}`,
      sub: t?.name ?? f.round ?? undefined,
      status: f.status.toLowerCase(),
      metas: [
        { k: 'Date', v: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) },
        { k: 'Venue', v: f.venue ?? '—' },
      ],
      onPress: f.status === 'SCHEDULED' && f.homeTeamId && dt.getTime() <= Date.now()
        ? () => resultMutation.mutate({ id: f.id, winnerTeamId: f.homeTeamId! })
        : undefined,
    };
  });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Fixtures" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ New fixture'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Tournament / meet</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(tournamentsQuery.data ?? []).map((t) => (
                <Pressable key={t.id} onPress={() => setTournamentId(t.id)} style={[styles.chip, tournamentId === t.id && styles.chipActive]}>
                  <Text style={[styles.chipText, tournamentId === t.id && styles.chipTextActive]}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Home team</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(teamsQuery.data ?? []).map((t) => (
                <Pressable key={t.id} onPress={() => setHomeTeamId(t.id)} style={[styles.chip, homeTeamId === t.id && styles.chipActive]}>
                  <Text style={[styles.chipText, homeTeamId === t.id && styles.chipTextActive]}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Away team</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(teamsQuery.data ?? []).map((t) => (
                <Pressable key={t.id} onPress={() => setAwayTeamId(t.id)} style={[styles.chip, awayTeamId === t.id && styles.chipActive]}>
                  <Text style={[styles.chipText, awayTeamId === t.id && styles.chipTextActive]}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput value={dateStr} onChangeText={setDateStr} placeholder="2026-09-25" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Time (HH:MM)</Text>
            <TextInput value={timeStr} onChangeText={setTimeStr} placeholder="16:00" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Venue</Text>
            <TextInput value={venue} onChangeText={setVenue} placeholder="District stadium" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save fixture'}</Text>
            </Pressable>
          </Card>
        ) : null}
        <Text style={styles.hint}>Tap a fixture whose scheduled time has passed to record the home team as winner (quick result entry).</Text>
        {resultMutation.isError ? <Text style={styles.error}>{(resultMutation.error as Error).message}</Text> : null}
        <RegisterList title="Fixtures" countLabel={`${sorted.length} fixtures`} rows={rows} emptyLabel="No fixtures scheduled yet." refreshing={fixturesQuery.isFetching} onRefresh={() => fixturesQuery.refetch()} />
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
  hint: { fontSize: 11.5, color: sportsColors.muted, lineHeight: 16 },
});
