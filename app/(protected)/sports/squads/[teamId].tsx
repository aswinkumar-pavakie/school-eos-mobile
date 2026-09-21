// Sports Admin -> Squad detail + roster. Real getTeam/listTeamRoster/
// addRosterMember/endRosterMember/assignCoach -- the exact same backend the
// website's own team detail screen already uses.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, StatusPill, SportsSubHeader } from '@/components/sports/primitives';
import { addRosterMember, assignCoach, endRosterMember, getTeam, listCoaches, listStudents, listTeamRoster } from '@/lib/sports-api';

export default function SquadDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCoachPicker, setShowCoachPicker] = useState(false);

  const teamQuery = useQuery({ queryKey: ['sports-team', teamId], queryFn: () => getTeam(teamId) });
  const rosterQuery = useQuery({ queryKey: ['sports-roster', teamId], queryFn: () => listTeamRoster(teamId) });
  const coachesQuery = useQuery({ queryKey: ['sports-coaches'], queryFn: listCoaches });
  const searchQuery = useQuery({
    queryKey: ['sports-student-search', query],
    queryFn: () => listStudents({ search: query }),
    enabled: query.trim().length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: (studentId: string) => addRosterMember(teamId, { studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-roster', teamId] });
      setQuery('');
      setShowAdd(false);
    },
  });
  const endMutation = useMutation({
    mutationFn: (memberId: string) => endRosterMember(teamId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-roster', teamId] }),
  });
  const assignCoachMutation = useMutation({
    mutationFn: (coachId: string) => assignCoach(teamId, coachId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-team', teamId] });
      setShowCoachPicker(false);
    },
  });

  const team = teamQuery.data;
  const coachName = team?.coachId ? coachesQuery.data?.find((c) => c.id === team.coachId)?.fullName : null;
  const active = (rosterQuery.data ?? []).filter((m) => m.status === 'ACTIVE');

  return (
    <View style={styles.flex}>
      <SportsSubHeader title={team?.name ?? 'Squad'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {!team ? (
          <ActivityIndicator color={sportsColors.primary} />
        ) : (
          <Card>
            <Text style={styles.squadName}>{team.name}</Text>
            <Text style={styles.squadMeta}>{team.sportName} · {active.length} player{active.length === 1 ? '' : 's'}{coachName ? ` · ${coachName}` : ' · No coach assigned'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
              <StatusPill label={team.status === 'ACTIVE' ? 'active' : 'inactive'} />
              <Pressable onPress={() => setShowCoachPicker((v) => !v)}>
                <Text style={styles.changeCoachText}>{coachName ? 'Change coach' : 'Assign coach'}</Text>
              </Pressable>
            </View>
            {showCoachPicker ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {(coachesQuery.data ?? []).map((c) => (
                  <Pressable
                    key={c.id}
                    disabled={assignCoachMutation.isPending}
                    onPress={() => assignCoachMutation.mutate(c.id)}
                    style={[styles.chip, team.coachId === c.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, team.coachId === c.id && styles.chipTextActive]}>{c.fullName}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        )}

        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Add player'}</Text>
        </Pressable>

        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or admission no."
              placeholderTextColor={sportsColors.faint}
              style={styles.input}
            />
            {searchQuery.data?.data.map((s) => (
              <Pressable key={s.id} style={styles.resultRow} onPress={() => addMutation.mutate(s.id)}>
                <Text style={styles.resultName}>{s.firstName} {s.lastName ?? ''}</Text>
                <Text style={styles.resultMeta}>{s.admissionNo}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Roster</Text>
        {rosterQuery.isLoading ? (
          <ActivityIndicator color={sportsColors.primary} />
        ) : active.length === 0 ? (
          <EmptyPanel label="No players on this squad yet." />
        ) : (
          active.map((m) => (
            <Card key={m.id} style={styles.rosterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{m.studentFirstName} {m.studentLastName}{m.jerseyNo !== null ? ` · #${m.jerseyNo}` : ''}</Text>
                <Text style={styles.resultMeta}>{m.role ?? '—'}</Text>
              </View>
              <Pressable onPress={() => endMutation.mutate(m.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
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
  squadName: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  squadMeta: { fontSize: 12.5, color: sportsColors.mutedStrong, marginTop: 6 },
  addButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  input: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: sportsColors.ink },
  resultRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft },
  resultName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  resultMeta: { fontSize: 12, color: sportsColors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, marginTop: 4 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  removeText: { color: sportsColors.red, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold' },
  changeCoachText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.primary },
  chip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  chipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
});
