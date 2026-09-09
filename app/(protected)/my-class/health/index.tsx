// Parent "Health" -- pixel-matched to the design reference's isHealth block
// (height/weight/blood-group summary card + visit log), wired to the real backend
// (school-eos-backend's parent-health.controller.ts), read-only. A null profile
// or an empty visit log are real, common states (no health record filed yet, no
// infirmary visits yet) -- shown as honest "—"/empty states, never a crash.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { formatDate, formatDateTime } from '@/lib/format';
import { getHealthOverview, type InfirmaryVisit } from '@/lib/parent-api';
import { cardShadow, parentColors } from '@/lib/theme';

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function VisitCard({ visit }: { visit: InfirmaryVisit }) {
  return (
    <View style={[styles.visitCard, cardShadow]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.visitReason}>{visit.complaint}</Text>
        <Text style={styles.visitMeta}>
          {formatDate(visit.visitedAt)} · {visit.action}
        </Text>
        <Text style={styles.visitBy}>Attended by {visit.attendedByName}</Text>
        {visit.parentNotifiedAt ? (
          <Text style={styles.visitNotified}>Parent notified {formatDateTime(visit.parentNotifiedAt)}</Text>
        ) : null}
      </View>
      <View style={styles.outcomePill}>
        <Text style={styles.outcomePillText}>{visit.outcome ?? 'Logged'}</Text>
      </View>
    </View>
  );
}

export default function HealthScreen() {
  const router = useRouter();
  const { selected, isLoading: childLoading } = useSelectedChild();
  const studentId = selected?.studentId;

  const healthQuery = useQuery({
    queryKey: ['health-overview', studentId],
    queryFn: () => getHealthOverview(studentId!),
    enabled: !!studentId,
  });

  if (childLoading || !selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Health" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const profile = healthQuery.data?.profile ?? null;
  const visits = healthQuery.data?.visits ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Health" subtitle={selected.studentName} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={healthQuery.isFetching} onRefresh={() => healthQuery.refetch()} />}
      >
        {healthQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : healthQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{extractErrorMessage(healthQuery.error, 'Unable to load the health record.')}</Text>
            <Pressable style={styles.retryButton} onPress={() => healthQuery.refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.recordCard, cardShadow]}>
              <Text style={styles.recordLabel}>Health record</Text>
              <View style={styles.grid}>
                <View>
                  <Text style={styles.gridValue}>{profile?.heightCm != null ? `${profile.heightCm} cm` : '—'}</Text>
                  <Text style={styles.gridLabel}>Height</Text>
                </View>
                <View>
                  <Text style={styles.gridValue}>{profile?.weightKg != null ? `${profile.weightKg} kg` : '—'}</Text>
                  <Text style={styles.gridLabel}>Weight</Text>
                </View>
                <View>
                  <Text style={styles.gridValue}>{profile?.bloodGroup ?? '—'}</Text>
                  <Text style={styles.gridLabel}>Blood group</Text>
                </View>
              </View>

              {profile ? (
                <View style={{ marginTop: 12, gap: 4 }}>
                  {profile.measuredOn ? <Text style={styles.recordDetail}>Last measured {formatDate(profile.measuredOn)}</Text> : null}
                  {profile.notes ? <Text style={styles.recordDetail}>{profile.notes}</Text> : null}
                  {profile.familyDoctor ? (
                    <Text style={styles.recordDetail}>
                      Family doctor: {profile.familyDoctor}
                      {profile.doctorPhone ? ` · ${profile.doctorPhone}` : ''}
                    </Text>
                  ) : null}
                  {profile.insuranceRef ? <Text style={styles.recordDetail}>Insurance ref: {profile.insuranceRef}</Text> : null}
                </View>
              ) : (
                <Text style={[styles.recordDetail, { marginTop: 12 }]}>No health profile recorded yet.</Text>
              )}
            </View>

            <Text style={styles.sectionLabel}>Visit log</Text>
            {visits.length === 0 ? (
              <View style={styles.noMatchCard}>
                <Text style={styles.noMatchTitle}>No infirmary visits</Text>
                <Text style={styles.noMatchSubtitle}>Any visit to the school infirmary will appear here.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {visits.map((v) => (
                  <VisitCard key={v.id} visit={v} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  errorText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.redDark, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },

  recordCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 16 },
  recordLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.4,
    color: parentColors.muted,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  gridValue: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  gridLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  recordDetail: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.bodyMuted, lineHeight: 19 },

  sectionLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.7,
    color: parentColors.muted,
    textTransform: 'uppercase',
  },

  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  visitReason: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  visitMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  visitBy: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, marginTop: 3 },
  visitNotified: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, marginTop: 3 },
  outcomePill: { backgroundColor: parentColors.pillBlueBg, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99 },
  outcomePillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },

  noMatchCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  noMatchTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  noMatchSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 5, textAlign: 'center' },
});
