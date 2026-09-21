// Sports Admin -> Meet Setup. Real reuse of the already-real tournament
// flow (listTournaments/createTournament/listSports) -- the design's own
// "Meet Setup" tile maps directly onto creating a Tournament record, no new
// backend needed (a "meet" is a Tournament in this schema).

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, SportsSubHeader } from '@/components/sports/primitives';
import { RegisterList, type RegisterRow } from '@/components/sports/RegisterList';
import { createTournament, listSports, listTournaments } from '@/lib/sports-api';

// Real tournament.level enum (tournament_level_check) -- confirmed via
// create-tournament.dto.ts's own TOURNAMENT_LEVELS; live-tested via the
// real /sports/tournaments POST, which 400s on anything else.
const LEVELS = ['INTER_HOUSE', 'INTER_SCHOOL', 'BLOCK', 'DISTRICT', 'STATE', 'NATIONAL'];

export default function MeetsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [sportId, setSportId] = useState<string | null>(null);
  const [level, setLevel] = useState<string>('INTER_HOUSE');
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');

  const tournamentsQuery = useQuery({ queryKey: ['sports-tournaments'], queryFn: listTournaments });
  const sportsQuery = useQuery({ queryKey: ['sports-list'], queryFn: listSports, enabled: showAdd });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!sportId || !name.trim() || !startStr || !endStr) throw new Error('Fill in the sport, name and dates.');
      return createTournament({ sportId, name: name.trim(), level, startDate: startStr, endDate: endStr, venue: venue || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-tournaments'] });
      setShowAdd(false);
      setSportId(null);
      setName('');
      setVenue('');
      setStartStr('');
      setEndStr('');
    },
  });

  const rows: RegisterRow[] = (tournamentsQuery.data ?? [])
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .map((t) => ({
      key: t.id,
      title: t.name,
      sub: `${t.sportName} · ${t.level.replace(/_/g, ' ')}`,
      status: t.state.toLowerCase(),
      metas: [
        { k: 'Dates', v: `${new Date(t.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${new Date(t.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` },
        { k: 'Venue', v: t.venue ?? '—' },
      ],
    }));

  return (
    <View style={{ flex: 1, backgroundColor: sportsColors.surface }}>
      <SportsSubHeader title="Meet setup" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ New meet'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Sport</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(sportsQuery.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => setSportId(s.id)} style={[styles.chip, sportId === s.id && styles.chipActive]}>
                  <Text style={[styles.chipText, sportId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Level</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LEVELS.map((l) => (
                <Pressable key={l} onPress={() => setLevel(l)} style={[styles.chip, level === l && styles.chipActive]}>
                  <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l.replace(/_/g, ' ')}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Meet name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Inter-school athletics meet" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
            <TextInput value={startStr} onChangeText={setStartStr} placeholder="2026-10-10" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
            <TextInput value={endStr} onChangeText={setEndStr} placeholder="2026-10-11" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Venue</Text>
            <TextInput value={venue} onChangeText={setVenue} placeholder="District stadium" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save meet'}</Text>
            </Pressable>
          </Card>
        ) : null}
        <RegisterList title="Meets" countLabel={`${tournamentsQuery.data?.length ?? 0} meets`} rows={rows} emptyLabel="No meets set up yet." refreshing={tournamentsQuery.isFetching} onRefresh={() => tournamentsQuery.refetch()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
