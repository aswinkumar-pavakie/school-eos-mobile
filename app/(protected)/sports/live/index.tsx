// Sports Admin -> Live Session. Real reuse of the already-real training
// attendance flow (listTrainingSessions/listTeamRoster/
// recordTrainingAttendance) -- the design's own "Live Session" tile maps
// directly onto marking today's training attendance, no new backend needed.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader } from '@/components/sports/primitives';
import { listTeamRoster, listTrainingAttendance, listTrainingSessions, recordTrainingAttendance } from '@/lib/sports-api';

type Mark = 'PRESENT' | 'ABSENT' | 'LATE';

export default function LiveSessionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});

  const sessionsQuery = useQuery({ queryKey: ['sports-sessions'], queryFn: listTrainingSessions });
  const todaySessions = useMemo(() => {
    const todayStr = new Date().toDateString();
    return (sessionsQuery.data ?? []).filter((s) => new Date(s.scheduledAt).toDateString() === todayStr);
  }, [sessionsQuery.data]);
  const activeSession = todaySessions.find((s) => s.id === sessionId) ?? todaySessions[0];

  const rosterQuery = useQuery({
    queryKey: ['sports-roster', activeSession?.teamId],
    queryFn: () => listTeamRoster(activeSession!.teamId),
    enabled: !!activeSession,
  });
  const attendanceQuery = useQuery({
    queryKey: ['sports-attendance', activeSession?.id],
    queryFn: () => listTrainingAttendance(activeSession!.id),
    enabled: !!activeSession,
  });

  const active = (rosterQuery.data ?? []).filter((m) => m.status === 'ACTIVE');
  const existing = attendanceQuery.data ?? [];

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!activeSession) throw new Error('Select a session first.');
      const entries = active.map((m) => ({
        studentId: m.studentId,
        status: marks[m.studentId] ?? (existing.find((e) => e.studentId === m.studentId)?.status as Mark | undefined) ?? 'PRESENT',
      }));
      return recordTrainingAttendance(activeSession.id, entries);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-attendance', activeSession?.id] });
      setMarks({});
    },
  });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Live session" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {todaySessions.length === 0 ? (
          <EmptyPanel label="No training sessions scheduled for today." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {todaySessions.map((s) => (
                <Pressable key={s.id} onPress={() => setSessionId(s.id)} style={[styles.chip, activeSession?.id === s.id && styles.chipActive]}>
                  <Text style={[styles.chipText, activeSession?.id === s.id && styles.chipTextActive]}>{s.teamName}</Text>
                </Pressable>
              ))}
            </View>
            {activeSession ? (
              <Card style={{ gap: 4 }}>
                <Text style={styles.sessionTitle}>{activeSession.focus ?? 'Training'} — {activeSession.teamName}</Text>
                <Text style={styles.sessionMeta}>{activeSession.venue ?? 'Venue not set'} · {new Date(activeSession.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
              </Card>
            ) : null}
            {rosterQuery.isLoading ? (
              <ActivityIndicator color={sportsColors.primary} />
            ) : active.length === 0 ? (
              <EmptyPanel label="No players on this squad yet." />
            ) : (
              active.map((m) => {
                const current = marks[m.studentId] ?? (existing.find((e) => e.studentId === m.studentId)?.status as Mark | undefined) ?? 'PRESENT';
                return (
                  <Card key={m.id} style={styles.rosterRow}>
                    <Text style={styles.playerName}>{m.studentFirstName} {m.studentLastName}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['PRESENT', 'LATE', 'ABSENT'] as Mark[]).map((opt) => (
                        <Pressable
                          key={opt}
                          onPress={() => setMarks((prev) => ({ ...prev, [m.studentId]: opt }))}
                          style={[styles.markChip, current === opt && styles.markChipActive]}
                        >
                          <Text style={[styles.markChipText, current === opt && styles.markChipTextActive]}>{opt[0]}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Card>
                );
              })
            )}
            {active.length > 0 ? (
              <Pressable style={styles.saveButton} onPress={() => submitMutation.mutate()}>
                <Text style={styles.saveButtonText}>{submitMutation.isPending ? 'Saving…' : 'Save attendance'}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  chip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  chipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  sessionTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  sessionMeta: { fontSize: 12, color: sportsColors.mutedStrong },
  rosterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  playerName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.ink, flex: 1 },
  markChip: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: sportsColors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  markChipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  markChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.bodyStrong },
  markChipTextActive: { color: '#fff' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
