// Sports Admin -> Achievements. Real listAchievements()/createAchievement()
// -- already fully real and wired for SPORTS_ADMIN, but had no mobile
// screen at all until now (confirmed real API surface with no matching UI,
// same "backend real, frontend missing" pattern already fixed elsewhere
// this build). Added as a new tile in the PLAYERS & SQUADS group -- not
// present in the mobile design's own grid, disclosed here the same way
// Hostel Warden's own additions were.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, SportsSubHeader } from '@/components/sports/primitives';
import { RegisterList, type RegisterRow } from '@/components/sports/RegisterList';
import { createAchievement, listAchievements, listMyTeams, listStudents } from '@/lib/sports-api';

const LEVELS = ['SCHOOL', 'BLOCK', 'DISTRICT', 'STATE', 'NATIONAL', 'INTERNATIONAL'];

export default function AchievementsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLabel, setStudentLabel] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [placement, setPlacement] = useState('');
  const [level, setLevel] = useState<string>('SCHOOL');
  const [title, setTitle] = useState('');
  const [awardedOn, setAwardedOn] = useState('');

  const achievementsQuery = useQuery({ queryKey: ['sports-achievements'], queryFn: listAchievements });
  const teamsQuery = useQuery({ queryKey: ['sports-teams'], queryFn: listMyTeams, enabled: showAdd });
  const searchQuery = useQuery({
    queryKey: ['sports-student-search', query],
    queryFn: () => listStudents({ search: query }),
    enabled: query.trim().length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!studentId || !teamId || !placement.trim() || !awardedOn) throw new Error('Pick a student, squad, placement and date.');
      return createAchievement({ studentId, teamId, placement: placement.trim(), level, awardedOn, title: title.trim() || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-achievements'] });
      setShowAdd(false);
      setStudentId(null);
      setStudentLabel('');
      setQuery('');
      setTeamId(null);
      setPlacement('');
      setTitle('');
      setAwardedOn('');
    },
  });

  const sorted = [...(achievementsQuery.data ?? [])].sort((a, b) => new Date(b.awardedOn).getTime() - new Date(a.awardedOn).getTime());
  const rows: RegisterRow[] = sorted.map((a) => ({
    key: a.id,
    title: a.title ?? `${a.studentFirstName} ${a.studentLastName}`,
    sub: `${a.studentFirstName} ${a.studentLastName} · ${a.teamName ?? 'Sports'}`,
    status: a.placement,
    metas: [
      { k: 'Level', v: a.level ?? '—' },
      { k: 'Awarded', v: new Date(a.awardedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
    ],
  }));

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Achievements" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Add achievement'}</Text>
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
            <Text style={styles.label}>Squad</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(teamsQuery.data ?? []).map((t) => (
                <Pressable key={t.id} onPress={() => setTeamId(t.id)} style={[styles.chip, teamId === t.id && styles.chipActive]}>
                  <Text style={[styles.chipText, teamId === t.id && styles.chipTextActive]}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Title (optional)</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="District Athletics Meet" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Placement</Text>
            <TextInput value={placement} onChangeText={setPlacement} placeholder="1st place, Gold medal" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Level</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LEVELS.map((l) => (
                <Pressable key={l} onPress={() => setLevel(l)} style={[styles.chip, level === l && styles.chipActive]}>
                  <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l[0]}{l.slice(1).toLowerCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Awarded on (YYYY-MM-DD)</Text>
            <TextInput value={awardedOn} onChangeText={setAwardedOn} placeholder="2026-10-12" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save achievement'}</Text>
            </Pressable>
          </Card>
        ) : null}
        <RegisterList
          title="Results register"
          countLabel={`${sorted.length} recognitions`}
          rows={rows}
          emptyLabel="No achievements recorded yet."
          refreshing={achievementsQuery.isFetching}
          onRefresh={() => achievementsQuery.refetch()}
        />
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
});
