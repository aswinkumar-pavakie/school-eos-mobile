// Academic Coordinator Hub -- a role-conditional feature with no design
// reference at all (see erp/index.tsx's own tile-gating comment); built
// using the same global facultyColors tokens + shared components as every
// other Faculty screen, per the explicit "use the global css" instruction.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { StatCards } from '@/components/faculty/StatCards';
import { ServiceIcon } from '@/components/ServiceIcon';
import { getCoordinatorDashboard } from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

const STAGE_LABELS: Record<string, string> = {
  PRE_PRIMARY: 'Pre-Primary',
  PRIMARY: 'Primary',
  MIDDLE: 'Middle',
  SECONDARY: 'Secondary',
  HIGHER_SECONDARY: 'Higher Secondary',
};

const TILES = [
  { key: 'records' as const, label: 'Academic Structure', href: '/(protected)/faculty/coordinator/structure' },
  { key: 'classTeacher' as const, label: 'Faculty & Workload', href: '/(protected)/faculty/coordinator/offerings' },
  { key: 'attendance' as const, label: 'Class Timetable', href: '/(protected)/faculty/coordinator/timetable' },
  { key: 'exams' as const, label: 'Examinations', href: '/(protected)/faculty/coordinator/exams' },
  { key: 'meetings' as const, label: 'Academic Calendar', href: '/(protected)/faculty/coordinator/calendar' },
];

export default function CoordinatorHubScreen() {
  const router = useRouter();
  const dashboardQuery = useQuery({ queryKey: ['coordinator-dashboard'], queryFn: getCoordinatorDashboard });
  const d = dashboardQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader
        title="Academic Coordinator"
        subtitle={d ? d.stages.map((s) => STAGE_LABELS[s] ?? s).join(', ') : 'Loading scope…'}
        onBack={() => router.replace('/erp' as never)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={dashboardQuery.isFetching} onRefresh={() => dashboardQuery.refetch()} />}
      >
        {dashboardQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : d ? (
          <>
            <View style={{ gap: 10 }}>
              <StatCards items={[
                { label: 'GRADES', value: String(d.gradeCount) },
                { label: 'SECTIONS', value: String(d.sectionCount) },
                { label: 'STUDENTS', value: String(d.studentCount) },
              ]} />
              <StatCards items={[
                { label: 'SUBJECT CLASSES', value: String(d.subjectOfferingCount) },
                { label: 'FACULTY', value: String(d.facultyCount) },
                { label: 'UNASSIGNED', value: String(d.unassignedOfferings), valueColor: d.unassignedOfferings > 0 ? facultyColors.amberDark : undefined },
              ]} />
            </View>

            {d.sectionsWithoutAdvisor > 0 ? (
              <View style={styles.alertBox}>
                <Text style={styles.alertText}>{d.sectionsWithoutAdvisor} section{d.sectionsWithoutAdvisor === 1 ? '' : 's'} in your scope have no class advisor assigned.</Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>MANAGE</Text>
            <View style={styles.grid}>
              {TILES.map((tile) => (
                <Pressable key={tile.key} style={styles.tile} onPress={() => router.push(tile.href as never)}>
                  <View style={styles.iconCircle}>
                    <ServiceIcon name={tile.key} color="#fff" size={24} />
                  </View>
                  <Text style={styles.tileLabel}>{tile.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 14 },
  alertBox: { backgroundColor: facultyColors.amberBg, borderRadius: 12, padding: 12 },
  alertText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.amberDark },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  tile: { width: '30%', alignItems: 'center', gap: 8 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: facultyColors.blueTile, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.ink, textAlign: 'center', lineHeight: 15 },
});
