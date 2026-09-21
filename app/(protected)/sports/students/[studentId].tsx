// Sports Admin -> Student detail. Real getStudent() + real per-sport
// enrollment (listSports/listSportsProfiles/createSportsProfile) -- the
// same real "MANAGE" capability the website's own Students page now wires
// (enroll a student directly into a sport, real POST /sports/:id/profiles,
// already granted to SPORTS_ADMIN). Previously this screen only showed a
// bare read-only card with no action at all -- a real, confirmed gap.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, StatusPill, SportsSubHeader } from '@/components/sports/primitives';
import { getStudent, listSports, listSportsProfiles, createSportsProfile, updateSportsProfile } from '@/lib/sports-api';
import { ApiError } from '@/lib/api';

export default function StudentDetailScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [pickedSportId, setPickedSportId] = useState<string | null>(null);
  const [positionOrRole, setPositionOrRole] = useState('');

  const studentQuery = useQuery({ queryKey: ['sports-student', studentId], queryFn: () => getStudent(studentId) });
  const sportsQuery = useQuery({ queryKey: ['sports-list'], queryFn: listSports });

  const profilesQuery = useQuery({
    queryKey: ['sports-student-profiles', studentId, sportsQuery.data?.map((s) => s.id)],
    queryFn: async () => {
      const all = await Promise.all((sportsQuery.data ?? []).map((sp) => listSportsProfiles(sp.id).catch(() => [])));
      return all.flat().filter((p) => p.studentId === studentId);
    },
    enabled: !!sportsQuery.data,
  });

  const enrolledSportIds = useMemo(() => new Set((profilesQuery.data ?? []).map((p) => p.sportId)), [profilesQuery.data]);
  const availableSports = useMemo(() => (sportsQuery.data ?? []).filter((sp) => !enrolledSportIds.has(sp.id)), [sportsQuery.data, enrolledSportIds]);

  const enrollMutation = useMutation({
    mutationFn: () => {
      if (!pickedSportId) throw new Error('Select a sport.');
      return createSportsProfile(pickedSportId, { studentId, positionOrRole: positionOrRole.trim() || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-student-profiles', studentId] });
      setEnrollOpen(false);
      setPickedSportId(null);
      setPositionOrRole('');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ sportId, profileId, status }: { sportId: string; profileId: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateSportsProfile(sportId, profileId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-student-profiles', studentId] }),
  });

  const s = studentQuery.data;
  const sportNameById = new Map((sportsQuery.data ?? []).map((sp) => [sp.id, sp.name]));

  return (
    <View style={styles.flex}>
      <SportsSubHeader title={s ? `${s.firstName} ${s.lastName ?? ''}`.trim() : 'Student'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {!s ? (
          <ActivityIndicator color={sportsColors.primary} />
        ) : (
          <Card style={{ gap: 12 }}>
            <View>
              <Text style={styles.name}>{s.firstName} {s.lastName ?? ''}</Text>
              <Text style={styles.meta}>{[s.gradeName, s.sectionName].filter(Boolean).join(' · ') || 'No class assigned'}</Text>
            </View>
            <StatusPill label={s.status === 'ACTIVE' ? 'active' : 'inactive'} />
            <View style={styles.metaBlock}>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Admission no.</Text>
                <Text style={styles.metaValue}>{s.admissionNo}</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Sports enrolled</Text>
          <Pressable onPress={() => setEnrollOpen((v) => !v)}>
            <Text style={styles.addLink}>{enrollOpen ? 'Close' : '+ Enroll'}</Text>
          </Pressable>
        </View>

        {enrollOpen ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Sport</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {availableSports.map((sp) => (
                <Pressable key={sp.id} onPress={() => setPickedSportId(sp.id)} style={[styles.chip, pickedSportId === sp.id && styles.chipActive]}>
                  <Text style={[styles.chipText, pickedSportId === sp.id && styles.chipTextActive]}>{sp.name}</Text>
                </Pressable>
              ))}
              {availableSports.length === 0 ? <Text style={styles.meta}>Already enrolled in every sport.</Text> : null}
            </View>
            {enrollMutation.isError ? (
              <Text style={styles.error}>{enrollMutation.error instanceof ApiError ? enrollMutation.error.message : (enrollMutation.error as Error).message}</Text>
            ) : null}
            <Pressable style={styles.saveButton} onPress={() => enrollMutation.mutate()}>
              <Text style={styles.saveButtonText}>{enrollMutation.isPending ? 'Enrolling…' : 'Enroll'}</Text>
            </Pressable>
          </Card>
        ) : null}

        {profilesQuery.isLoading ? (
          <ActivityIndicator color={sportsColors.primary} />
        ) : (profilesQuery.data ?? []).length === 0 ? (
          <EmptyPanel label="Not enrolled in any sport yet." />
        ) : (
          (profilesQuery.data ?? []).map((p) => (
            <Card key={p.id} style={{ gap: 10 }}>
              <View style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{sportNameById.get(p.sportId) ?? 'Sport'}</Text>
                  {p.positionOrRole ? <Text style={styles.meta}>{p.positionOrRole}</Text> : null}
                </View>
                <StatusPill label={p.status === 'ACTIVE' ? 'active' : 'inactive'} />
              </View>
              <Pressable
                disabled={toggleStatusMutation.isPending}
                style={styles.toggleButton}
                onPress={() => toggleStatusMutation.mutate({ sportId: p.sportId, profileId: p.id, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
              >
                <Text style={styles.toggleButtonText}>{p.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</Text>
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
  name: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  meta: { fontSize: 12.5, color: sportsColors.mutedStrong, marginTop: 4 },
  metaBlock: { gap: 7, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, paddingTop: 11 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaKey: { flex: 1, fontSize: 12, color: sportsColors.tertiary },
  metaValue: { flex: 1.2, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong, textAlign: 'right' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  sectionTitle: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  addLink: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.primary },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: sportsColors.tertiary },
  chip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  chipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  error: { fontSize: 12.5, color: sportsColors.red },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  toggleButton: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  toggleButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong },
});
