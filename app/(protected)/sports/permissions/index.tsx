// Sports Admin -> Ask Permissions. Corrected from an earlier assumed gap:
// the generic permission-activity engine really is FACULTY-only and
// single-section-scoped, but "asking permission for a squad drawn from
// several classes to go on-duty" is exactly what the real, already-built
// sports_od_request backend already models (same real capability the
// website's own OD requests page uses -- "Raised to the principal for a
// squad drawn from several classes"), confirmed by re-reading that page's
// own subtitle. This screen was misclassified as a gap; it's real.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, SportsSubHeader } from '@/components/sports/primitives';
import { RegisterList, type RegisterRow } from '@/components/sports/RegisterList';
import { createOdRequest, listMyTeams, listOdRequests } from '@/lib/sports-api';

export default function AskPermissionsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [reason, setReason] = useState('');

  const requestsQuery = useQuery({ queryKey: ['sports-od-requests'], queryFn: listOdRequests });
  const teamsQuery = useQuery({ queryKey: ['sports-teams'], queryFn: listMyTeams, enabled: showAdd });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!teamId || !eventDate || !reason.trim()) throw new Error('Pick a squad, date and reason.');
      return createOdRequest({ teamId, eventDate, reason: reason.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-od-requests'] });
      setShowAdd(false);
      setTeamId(null);
      setEventDate('');
      setReason('');
    },
  });

  const sorted = [...(requestsQuery.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const rows: RegisterRow[] = sorted.map((r) => ({
    key: r.id,
    title: `${r.teamName} · ${r.sportName}`,
    sub: r.reason,
    status: r.state.toLowerCase(),
    metas: [{ k: 'Event date', v: new Date(r.eventDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }],
  }));

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Ask permissions" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Request on-duty'}</Text>
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
            <Text style={styles.label}>Event date (YYYY-MM-DD)</Text>
            <TextInput value={eventDate} onChangeText={setEventDate} placeholder="2026-10-12" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Reason</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="District Athletics Meet — away fixture" placeholderTextColor={sportsColors.faint} style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} multiline />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Submitting…' : 'Submit to principal'}</Text>
            </Pressable>
          </Card>
        ) : null}
        <RegisterList
          title="OD requests"
          countLabel={`${sorted.length} requests`}
          rows={rows}
          emptyLabel="No on-duty requests raised yet."
          refreshing={requestsQuery.isFetching}
          onRefresh={() => requestsQuery.refetch()}
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
  chip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  chipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  error: { fontSize: 12.5, color: sportsColors.red },
});
