// Principal -> Subjects & mapping -- full feature parity with the
// website's own /principal/academics/subject-mapping page, previously
// mobile-missing entirely. Real data: subject_offering, already fully
// populated, with a PRINCIPAL-readable GET /subject-offerings/all route
// (see principal-academics-api.ts's own comment). Read-only oversight --
// assigning a teacher stays an Admin action, not duplicated here.

import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { principalColors } from '@/lib/theme';
import { listAllSubjectOfferings } from '@/lib/principal-academics-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export default function PrincipalSubjectMappingScreen() {
  const router = useRouter();
  const offeringsQuery = useQuery({ queryKey: ['principal-subject-mapping'], queryFn: listAllSubjectOfferings });

  const { rows, mappedTeacherCount, avgLoad, unmappedCount } = useMemo(() => {
    const offerings = offeringsQuery.data ?? [];
    const bySubject = new Map<string, { subjectName: string; sections: Set<string>; periods: number; mapped: number; total: number }>();
    const mappedTeacherIds = new Set<string>();
    let unmapped = 0;
    for (const o of offerings) {
      const entry = bySubject.get(o.subjectId) ?? { subjectName: o.subjectName, sections: new Set<string>(), periods: 0, mapped: 0, total: 0 };
      entry.sections.add(`${o.gradeName} ${o.sectionName}`);
      entry.periods += o.weeklyPeriods;
      entry.total += 1;
      if (o.teacherStaffId) entry.mapped += 1;
      else unmapped += 1;
      if (o.teacherStaffId) mappedTeacherIds.add(o.teacherStaffId);
      bySubject.set(o.subjectId, entry);
    }
    const sortedRows = Array.from(bySubject.entries()).sort((a, b) => a[1].subjectName.localeCompare(b[1].subjectName));
    const avg = mappedTeacherIds.size > 0
      ? Math.round(offerings.reduce((sum, o) => sum + (o.teacherStaffId ? o.weeklyPeriods : 0), 0) / mappedTeacherIds.size)
      : 0;
    return { rows: sortedRows, mappedTeacherCount: mappedTeacherIds.size, avgLoad: avg, unmappedCount: unmapped };
  }, [offeringsQuery.data]);

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="Subjects &amp; mapping" subtitle="Which teacher carries which subject" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {offeringsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 24 }} />
        ) : offeringsQuery.isError ? (
          <ErrorState
            message={offeringsQuery.error instanceof ApiError ? offeringsQuery.error.message : 'Unable to load subject mapping.'}
            onRetry={() => offeringsQuery.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState message="No subject offerings for the current academic year." />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{rows.length}</Text>
                <Text style={styles.statLabel}>Subjects mapped</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{mappedTeacherCount}</Text>
                <Text style={styles.statLabel}>Teachers assigned</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{avgLoad}</Text>
                <Text style={styles.statLabel}>Avg. periods/wk per teacher</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{unmappedCount}</Text>
                <Text style={styles.statLabel}>Unmapped offerings</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Subjects</Text>
            <View style={[styles.list, cardShadow]}>
              {rows.map(([subjectId, r], index) => (
                <View key={subjectId} style={[styles.row, index === 0 && styles.rowFirst]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle}>{r.subjectName}</Text>
                    <Text style={styles.rowMeta}>{r.sections.size} sections · {r.periods} periods/wk</Text>
                  </View>
                  <StatusBadge
                    label={r.mapped === r.total ? 'Mapped' : `${r.mapped}/${r.total} mapped`}
                    tone={r.mapped === r.total ? 'positive' : 'warning'}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  statLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 18, marginBottom: 10 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: principalColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 2 },
});
