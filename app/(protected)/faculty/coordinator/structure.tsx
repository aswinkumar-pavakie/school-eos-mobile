// Academic Coordinator -- Academic Structure: every grade/section in scope,
// with its real class advisor (or the lack of one) and a real assign/change/
// revoke action (role_assignment CLASS_ADVISOR, exactly the same mechanism
// Class Teacher's own advisor status already reads elsewhere in this app).

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { CloseIcon, EditIcon, TrashIcon } from '@/components/faculty/icons';
import {
  getCoordinatorStructure,
  getEligibleFaculty,
  assignClassAdvisor,
  revokeClassAdvisor,
  type CoordinatorSection,
} from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

export default function CoordinatorStructureScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [gradeFilter, setGradeFilter] = useState<string | 'all'>('all');
  const [pickerSection, setPickerSection] = useState<CoordinatorSection | null>(null);
  const [busySectionId, setBusySectionId] = useState<string | null>(null);

  const structureQuery = useQuery({ queryKey: ['coordinator-structure'], queryFn: getCoordinatorStructure });
  const facultyQuery = useQuery({ queryKey: ['coordinator-eligible-faculty'], queryFn: getEligibleFaculty, enabled: !!pickerSection });

  const grades = structureQuery.data?.grades ?? [];
  const sections = structureQuery.data?.sections ?? [];
  const filtered = gradeFilter === 'all' ? sections : sections.filter((s) => s.gradeId === gradeFilter);

  async function handleAssign(personId: string) {
    if (!pickerSection) return;
    setBusySectionId(pickerSection.sectionId);
    try {
      await assignClassAdvisor(pickerSection.sectionId, personId);
      queryClient.invalidateQueries({ queryKey: ['coordinator-structure'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
      setPickerSection(null);
    } catch (err) {
      Alert.alert('Could not assign advisor', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusySectionId(null);
    }
  }

  function confirmRevoke(section: CoordinatorSection) {
    Alert.alert('Revoke class advisor?', `${section.advisorName} will no longer be the class advisor for ${section.gradeName} ${section.sectionName}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setBusySectionId(section.sectionId);
          try {
            await revokeClassAdvisor(section.sectionId);
            queryClient.invalidateQueries({ queryKey: ['coordinator-structure'] });
            queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
          } catch (err) {
            Alert.alert('Could not revoke', err instanceof Error ? err.message : 'Please try again.');
          } finally {
            setBusySectionId(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Academic Structure" subtitle="Grades, sections & class advisors" onBack={() => router.replace('/faculty/coordinator' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={structureQuery.isFetching} onRefresh={() => structureQuery.refetch()} />}
      >
        {structureQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
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

            <View style={{ gap: 8 }}>
              {filtered.map((s) => (
                <View key={s.sectionId} style={styles.card}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle}>{s.gradeName} {s.sectionName}</Text>
                    <Text style={styles.cardMeta}>{s.studentCount} students</Text>
                    {s.advisorName ? (
                      <Text style={styles.advisorText}>Advisor: {s.advisorName}</Text>
                    ) : (
                      <Text style={styles.noAdvisorText}>No advisor assigned</Text>
                    )}
                  </View>
                  {busySectionId === s.sectionId ? (
                    <ActivityIndicator color={facultyColors.blue} />
                  ) : (
                    <View style={styles.cardActions}>
                      <Pressable hitSlop={8} onPress={() => setPickerSection(s)}><EditIcon /></Pressable>
                      {s.advisorRoleAssignmentId ? (
                        <Pressable hitSlop={8} onPress={() => confirmRevoke(s)}><TrashIcon /></Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={!!pickerSection} animationType="slide" transparent onRequestClose={() => setPickerSection(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{pickerSection?.advisorName ? 'Change advisor' : 'Assign advisor'}</Text>
                <Text style={styles.sheetSubtitle}>{pickerSection?.gradeName} {pickerSection?.sectionName}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setPickerSection(null)}>
                <CloseIcon />
              </Pressable>
            </View>
            {facultyQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {(facultyQuery.data ?? []).map((f) => (
                  <Pressable key={f.staffId} style={styles.facultyRow} onPress={() => handleAssign(f.personId)}>
                    <Text style={styles.facultyName}>{f.name}</Text>
                    {f.designation ? <Text style={styles.facultyDesignation}>{f.designation}</Text> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  chipRow: { flexDirection: 'row', gap: 7 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight },
  chipActive: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  chipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  advisorText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.greenDark, marginTop: 5 },
  noAdvisorText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.amberDark, marginTop: 5 },
  cardActions: { flexDirection: 'row', gap: 14 },
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
