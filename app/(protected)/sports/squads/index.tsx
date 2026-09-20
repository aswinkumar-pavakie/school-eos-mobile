// Sports Admin -> Squads (Teams). Real listMyTeams()/createTeam() -- POST
// /sports/teams was already real and SPORTS_ADMIN-authorized on the backend
// (sports-faculty-teams.controller.ts) and createTeam() already existed in
// this file's own lib, just never called by any screen -- this wires the
// design's own "+ New squad" button to it. team.status is really only
// ACTIVE/INACTIVE (confirmed via a live DB check-constraint read earlier
// this build) -- the design's own mock 'active'/'forming'/'archived'
// statuses don't all exist in this schema, so this uses the real values
// instead.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { createTeam, listAcademicYears, listCoaches, listMyTeams, listSportCategories, listSports } from '@/lib/sports-api';

export default function SquadsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [sportCategoryId, setSportCategoryId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);

  const teamsQuery = useQuery({ queryKey: ['sports-teams'], queryFn: listMyTeams });
  const coachesQuery = useQuery({ queryKey: ['sports-coaches'], queryFn: listCoaches });
  const sportsQuery = useQuery({ queryKey: ['sports-list'], queryFn: listSports, enabled: showAdd });
  const categoriesQuery = useQuery({
    queryKey: ['sports-categories', sportId],
    queryFn: () => listSportCategories(sportId!),
    enabled: showAdd && !!sportId,
  });
  const yearsQuery = useQuery({ queryKey: ['sports-academic-years'], queryFn: listAcademicYears, enabled: showAdd });

  const coachById = useMemo(() => new Map((coachesQuery.data ?? []).map((c) => [c.id, c.fullName])), [coachesQuery.data]);

  const createMutation = useMutation({
    mutationFn: () => {
      const year = yearsQuery.data?.find((y) => y.isCurrent) ?? yearsQuery.data?.[0];
      if (!name.trim() || !sportId || !year) throw new Error('Enter a name and pick a sport.');
      return createTeam({
        sportId,
        sportCategoryId: sportCategoryId ?? undefined,
        academicYearId: year.id,
        name: name.trim(),
        coachId: coachId ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-teams'] });
      setShowAdd(false);
      setName('');
      setSportId(null);
      setSportCategoryId(null);
      setCoachId(null);
    },
  });

  const rows = (teamsQuery.data ?? []).filter(
    (t) => !search.trim() || t.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Squads" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ New squad'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Squad name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="U16 Boys Football" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Sport</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(sportsQuery.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => { setSportId(s.id); setSportCategoryId(null); }} style={[styles.chip, sportId === s.id && styles.chipActive]}>
                  <Text style={[styles.chipText, sportId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
            {sportId && (categoriesQuery.data ?? []).length > 0 ? (
              <>
                <Text style={styles.label}>Category (optional)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(categoriesQuery.data ?? []).map((c) => (
                    <Pressable key={c.id} onPress={() => setSportCategoryId(c.id)} style={[styles.chip, sportCategoryId === c.id && styles.chipActive]}>
                      <Text style={[styles.chipText, sportCategoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Text style={styles.label}>Coach (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(coachesQuery.data ?? []).map((c) => (
                <Pressable key={c.id} onPress={() => setCoachId(c.id)} style={[styles.chip, coachId === c.id && styles.chipActive]}>
                  <Text style={[styles.chipText, coachId === c.id && styles.chipTextActive]}>{c.fullName}</Text>
                </Pressable>
              ))}
            </View>
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Create squad'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search squads by name or coach"
            placeholderTextColor={sportsColors.faint}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Squad list</Text>
          <Text style={styles.count}>{rows.length} squad{rows.length === 1 ? '' : 's'}</Text>
        </View>
        {rows.length === 0 ? (
          <EmptyPanel label="No squads match this search." />
        ) : (
          rows.map((t) => (
            <Card key={t.id} style={styles.rowCard} onPress={() => router.push(`/sports/squads/${t.id}` as never)}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{t.name}</Text>
                  <Text style={styles.rowSub}>{t.sportName}</Text>
                </View>
                <StatusPill label={t.status === 'ACTIVE' ? 'active' : 'inactive'} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Coach</Text>
                  <Text style={styles.metaValue}>{t.coachId ? coachById.get(t.coachId) ?? '—' : 'Not assigned'}</Text>
                </View>
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
  content: { padding: 16, paddingBottom: 32, gap: 13 },
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
  searchBox: { borderWidth: 1, borderColor: sportsColors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchIcon: { color: sportsColors.faint, fontSize: 13 },
  searchInput: { flex: 1, fontSize: 13.5, color: sportsColors.ink, padding: 0 },
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
