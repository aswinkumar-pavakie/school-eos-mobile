// Academic Coordinator -- Examination configuration. Real exam/exam_grade
// tables (the same ones Marks Entry and Subject Records already read),
// scoped to the coordinator's own grades only.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { PlusIcon, CloseIcon, ChevronRightIcon } from '@/components/faculty/icons';
import { getCoordinatorStructure, listCoordinatorExams, createCoordinatorExam, type CoordinatorExam } from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

const EXAM_TYPES = ['UNIT_TEST', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'MODEL', 'REVISION', 'PRACTICAL', 'BOARD'];
const STATE_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', CONDUCTED: 'Conducted', MARKS_ENTRY: 'Marks entry open',
  VERIFIED: 'Verified', PUBLISHED: 'Published', LOCKED: 'Locked',
};

export default function CoordinatorExamsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [name, setName] = useState('');
  const [examType, setExamType] = useState(EXAM_TYPES[0]!);
  const [term, setTerm] = useState('');
  const [gradeIds, setGradeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const structureQuery = useQuery({ queryKey: ['coordinator-structure'], queryFn: getCoordinatorStructure });
  const examsQuery = useQuery({ queryKey: ['coordinator-exams'], queryFn: listCoordinatorExams });
  const grades = structureQuery.data?.grades ?? [];

  function openComposer() {
    setName('');
    setExamType(EXAM_TYPES[0]!);
    setTerm('');
    setGradeIds(grades.map((g) => g.gradeId));
    setComposerOpen(true);
  }

  function toggleGrade(id: string) {
    setGradeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const canSave = name.trim().length > 0 && gradeIds.length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await createCoordinatorExam({ name: name.trim(), examType, term: term.trim() || undefined, gradeIds });
      queryClient.invalidateQueries({ queryKey: ['coordinator-exams'] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not create exam', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Examinations" subtitle="Configuration & schedule" onBack={() => router.replace('/faculty/coordinator' as never)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={examsQuery.isFetching} onRefresh={() => examsQuery.refetch()} />}>
        <Pressable style={styles.addButton} onPress={openComposer}>
          <PlusIcon />
          <Text style={styles.addButtonText}>New exam</Text>
        </Pressable>

        {examsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (examsQuery.data ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No exams configured for your scope yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {(examsQuery.data ?? []).map((e: CoordinatorExam) => (
              <Pressable key={e.examId} style={styles.card} onPress={() => router.push(`/faculty/coordinator/exams/${e.examId}` as never)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle}>{e.name}</Text>
                  <Text style={styles.cardMeta}>{e.examType.replace('_', ' ')}{e.term ? ` · ${e.term}` : ''} · {e.gradeNames.join(', ')}</Text>
                </View>
                <View style={styles.stateBadge}><Text style={styles.stateBadgeText}>{STATE_LABELS[e.state] ?? e.state}</Text></View>
                <ChevronRightIcon color={facultyColors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>New exam</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Half Yearly Examination" style={styles.input} />

              <Text style={styles.fieldLabel}>TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {EXAM_TYPES.map((t) => (
                  <Pressable key={t} style={[styles.chip, examType === t && styles.chipActive]} onPress={() => setExamType(t)}>
                    <Text style={[styles.chipText, examType === t && styles.chipTextActive]}>{t.replace('_', ' ')}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>TERM</Text>
              <TextInput value={term} onChangeText={setTerm} placeholder="Optional, e.g. Term 1" style={styles.input} />

              <Text style={styles.fieldLabel}>GRADES</Text>
              <View style={{ gap: 8 }}>
                {grades.map((g) => {
                  const checked = gradeIds.includes(g.gradeId);
                  return (
                    <Pressable key={g.gradeId} style={[styles.shareRow, checked && styles.shareRowChecked]} onPress={() => toggleGrade(g.gradeId)}>
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked ? <Text style={styles.checkboxMark}>✓</Text> : null}</View>
                      <Text style={styles.shareRowText}>{g.gradeName}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create exam</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16 },
  addButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  stateBadge: { backgroundColor: facultyColors.blueLight, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999 },
  stateBadgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  chipRow: { flexDirection: 'row', gap: 7 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight },
  chipActive: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  chipText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  chipTextActive: { color: '#fff' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 },
  shareRowChecked: { borderColor: facultyColors.blue, backgroundColor: facultyColors.blueLight },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.6, borderColor: facultyColors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  checkboxMark: { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  shareRowText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
