// Academic Coordinator -- Faculty Academic Assignment (who teaches which
// class) + Faculty Workload monitoring. Reassigning a class's teacher here
// writes directly to the real subject_offering.teacher_staff_id -- academic
// assignment only, never HR/payroll (see the service's own scope note).

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { CloseIcon, EditIcon } from '@/components/faculty/icons';
import {
  getCoordinatorStructure,
  getCoordinatorOfferings,
  getEligibleFaculty,
  getFacultyWorkload,
  assignOfferingTeacher,
  type CoordinatorOffering,
} from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

type Tab = 'ASSIGNMENTS' | 'WORKLOAD';

export default function CoordinatorOfferingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('ASSIGNMENTS');

  return (
    <View style={styles.flex}>
      <AppHeader title="Faculty & Workload" subtitle="Academic assignment" onBack={() => router.replace('/faculty/coordinator' as never)} />
      <View style={styles.tabRow}>
        {(['ASSIGNMENTS', 'WORKLOAD'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'ASSIGNMENTS' ? 'Assignments' : 'Workload'}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'ASSIGNMENTS' ? <AssignmentsTab /> : <WorkloadTab />}
    </View>
  );
}

function AssignmentsTab() {
  const queryClient = useQueryClient();
  const [gradeFilter, setGradeFilter] = useState<string | 'all'>('all');
  const [pickerOffering, setPickerOffering] = useState<CoordinatorOffering | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const structureQuery = useQuery({ queryKey: ['coordinator-structure'], queryFn: getCoordinatorStructure });
  const offeringsQuery = useQuery({ queryKey: ['coordinator-offerings'], queryFn: () => getCoordinatorOfferings() });
  const facultyQuery = useQuery({ queryKey: ['coordinator-eligible-faculty'], queryFn: getEligibleFaculty, enabled: !!pickerOffering });

  const grades = structureQuery.data?.grades ?? [];
  const offerings = offeringsQuery.data ?? [];
  const filtered = gradeFilter === 'all' ? offerings : offerings.filter((o) => grades.find((g) => g.gradeId === gradeFilter)?.gradeName === o.gradeName);

  async function handleAssign(staffId: string) {
    if (!pickerOffering) return;
    setBusyId(pickerOffering.subjectOfferingId);
    try {
      await assignOfferingTeacher(pickerOffering.subjectOfferingId, staffId);
      queryClient.invalidateQueries({ queryKey: ['coordinator-offerings'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-workload'] });
      setPickerOffering(null);
    } catch (err) {
      Alert.alert('Could not assign teacher', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={offeringsQuery.isFetching} onRefresh={() => offeringsQuery.refetch()} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Pressable style={[styles.chip, gradeFilter === 'all' && styles.chipActive]} onPress={() => setGradeFilter('all')}>
          <Text style={[styles.chipText, gradeFilter === 'all' && styles.chipTextActive]}>All grades</Text>
        </Pressable>
        {grades.map((g) => {
          const active = gradeFilter === g.gradeId;
          return (
            <Pressable key={g.gradeId} style={[styles.chip, active && styles.chipActive]} onPress={() => setGradeFilter(g.gradeId)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.gradeName}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {offeringsQuery.isLoading ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : (
        <View style={{ gap: 8 }}>
          {filtered.map((o) => (
            <View key={o.subjectOfferingId} style={styles.card}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle}>{o.subjectName}</Text>
                <Text style={styles.cardMeta}>{o.gradeName} {o.sectionName} · {o.weeklyPeriods ?? '—'} periods/wk</Text>
                <Text style={o.teacherName ? styles.teacherText : styles.noTeacherText}>{o.teacherName ?? 'Unassigned'}</Text>
              </View>
              {busyId === o.subjectOfferingId ? (
                <ActivityIndicator color={facultyColors.blue} />
              ) : (
                <Pressable hitSlop={8} onPress={() => setPickerOffering(o)}><EditIcon /></Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <Modal visible={!!pickerOffering} animationType="slide" transparent onRequestClose={() => setPickerOffering(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Assign teacher</Text>
                <Text style={styles.sheetSubtitle}>{pickerOffering?.subjectName} · {pickerOffering?.gradeName} {pickerOffering?.sectionName}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setPickerOffering(null)}>
                <CloseIcon />
              </Pressable>
            </View>
            {facultyQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {(facultyQuery.data ?? []).map((f) => (
                  <Pressable key={f.staffId} style={styles.facultyRow} onPress={() => handleAssign(f.staffId)}>
                    <Text style={styles.facultyName}>{f.name}</Text>
                    {f.designation ? <Text style={styles.facultyDesignation}>{f.designation}</Text> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function WorkloadTab() {
  const workloadQuery = useQuery({ queryKey: ['coordinator-workload'], queryFn: getFacultyWorkload });
  const rows = workloadQuery.data ?? [];
  const maxPeriods = Math.max(1, ...rows.map((r) => r.weeklyPeriods));

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={workloadQuery.isFetching} onRefresh={() => workloadQuery.refetch()} />}>
      {workloadQuery.isLoading ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((r) => (
            <View key={r.staffId} style={styles.card}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle}>{r.name}</Text>
                <Text style={styles.cardMeta}>{r.offeringCount} class{r.offeringCount === 1 ? '' : 'es'} · {r.weeklyPeriods} periods/wk</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${(r.weeklyPeriods / maxPeriods) * 100}%` }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  tabRow: { flexDirection: 'row', gap: 6, backgroundColor: facultyColors.chipTrack, borderRadius: 12, padding: 4, marginHorizontal: 14, marginTop: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.mutedStrong },
  tabTextActive: { color: facultyColors.blueDark },
  tabContent: { padding: 14, paddingBottom: 32, gap: 12 },
  chipRow: { flexDirection: 'row', gap: 7 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight },
  chipActive: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  chipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  teacherText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.greenDark, marginTop: 5 },
  noTeacherText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.amberDark, marginTop: 5 },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: facultyColors.borderSoft, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: facultyColors.blue },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '80%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  facultyRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: facultyColors.borderSoft },
  facultyName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  facultyDesignation: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
});
