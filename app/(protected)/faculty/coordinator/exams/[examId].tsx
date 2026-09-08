// Academic Coordinator -- exam detail: real exam_subject configuration
// (date/time/marks per class) and real marks-entry readiness monitoring
// (expected vs entered vs verified, straight off the `mark` table Marks
// Entry itself writes to -- this screen never enters or edits a mark).

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { PlusIcon, CloseIcon } from '@/components/faculty/icons';
import {
  listCoordinatorExams,
  listExamSubjects,
  createExamSubject,
  getExamReadiness,
  advanceExamState,
  getCoordinatorOfferings,
} from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

type Tab = 'SUBJECTS' | 'READINESS';
const STATE_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', CONDUCTED: 'Conducted', MARKS_ENTRY: 'Marks entry open',
  VERIFIED: 'Verified', PUBLISHED: 'Published', LOCKED: 'Locked',
};
const NEXT_LABEL: Record<string, string> = { DRAFT: 'Mark scheduled', SCHEDULED: 'Mark conducted', CONDUCTED: 'Open marks entry' };

export default function CoordinatorExamDetailScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('SUBJECTS');
  const [advancing, setAdvancing] = useState(false);

  const examsQuery = useQuery({ queryKey: ['coordinator-exams'], queryFn: listCoordinatorExams });
  const exam = examsQuery.data?.find((e) => e.examId === examId);

  async function handleAdvance() {
    if (!examId) return;
    setAdvancing(true);
    try {
      await advanceExamState(examId);
      queryClient.invalidateQueries({ queryKey: ['coordinator-exams'] });
    } catch (err) {
      Alert.alert('Could not advance', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title={exam?.name ?? 'Exam'} subtitle={exam ? STATE_LABELS[exam.state] ?? exam.state : ''} onBack={() => router.replace('/faculty/coordinator/exams' as never)} />
      <View style={styles.tabRow}>
        {(['SUBJECTS', 'READINESS'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'SUBJECTS' ? 'Subjects' : 'Readiness'}</Text>
          </Pressable>
        ))}
      </View>

      {exam && NEXT_LABEL[exam.state] ? (
        <Pressable style={styles.advanceButton} onPress={handleAdvance} disabled={advancing}>
          {advancing ? <ActivityIndicator color="#fff" /> : <Text style={styles.advanceButtonText}>{NEXT_LABEL[exam.state]}</Text>}
        </Pressable>
      ) : null}

      {!examId || !exam ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : tab === 'SUBJECTS' ? (
        <SubjectsTab examId={examId} gradeNames={exam.gradeNames} />
      ) : (
        <ReadinessTab examId={examId} />
      )}
    </View>
  );
}

function SubjectsTab({ examId, gradeNames }: { examId: string; gradeNames: string[] }) {
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [maxMarks, setMaxMarks] = useState('100');
  const [passMarks, setPassMarks] = useState('');
  const [examDate, setExamDate] = useState('');
  const [saving, setSaving] = useState(false);

  const subjectsQuery = useQuery({ queryKey: ['coordinator-exam-subjects', examId], queryFn: () => listExamSubjects(examId) });
  const offeringsQuery = useQuery({ queryKey: ['coordinator-offerings-all'], queryFn: () => getCoordinatorOfferings(), enabled: composerOpen });
  const eligibleOfferings = (offeringsQuery.data ?? []).filter((o) => gradeNames.includes(o.gradeName));

  function openComposer() {
    setOfferingId(null);
    setMaxMarks('100');
    setPassMarks('');
    setExamDate('');
    setComposerOpen(true);
  }

  const canSave = !!offeringId && Number(maxMarks) > 0;

  async function handleSave() {
    if (!canSave || !offeringId) return;
    setSaving(true);
    try {
      await createExamSubject(examId, {
        subjectOfferingId: offeringId,
        maxMarks: Number(maxMarks),
        passMarks: passMarks.trim() ? Number(passMarks) : undefined,
        examDate: examDate.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['coordinator-exam-subjects', examId] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not add subject', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={subjectsQuery.isFetching} onRefresh={() => subjectsQuery.refetch()} />}>
      <Pressable style={styles.addButton} onPress={openComposer}>
        <PlusIcon />
        <Text style={styles.addButtonText}>Add a class</Text>
      </Pressable>

      {subjectsQuery.isLoading ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : (subjectsQuery.data ?? []).length === 0 ? (
        <Text style={styles.emptyText}>No classes configured for this exam yet.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {(subjectsQuery.data ?? []).map((s) => (
            <View key={s.examSubjectId} style={styles.card}>
              <Text style={styles.cardTitle}>{s.subjectName} · {s.gradeName} {s.sectionName}</Text>
              <Text style={styles.cardMeta}>
                Max {s.maxMarks}{s.passMarks ? ` · Pass ${s.passMarks}` : ''}{s.examDate ? ` · ${s.examDate}` : ''}{s.room ? ` · ${s.room}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}><Text style={styles.sheetTitle}>Add a class to this exam</Text></View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}><CloseIcon /></Pressable>
              </View>

              <Text style={styles.fieldLabel}>CLASS</Text>
              {offeringsQuery.isLoading ? (
                <ActivityIndicator color={facultyColors.blue} />
              ) : (
                <View style={{ gap: 6 }}>
                  {eligibleOfferings.map((o) => {
                    const active = offeringId === o.subjectOfferingId;
                    return (
                      <Pressable key={o.subjectOfferingId} style={[styles.optionRow, active && styles.optionRowActive]} onPress={() => setOfferingId(o.subjectOfferingId)}>
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{o.subjectName} · {o.gradeName} {o.sectionName}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={styles.fieldLabel}>MAX MARKS</Text>
              <TextInput value={maxMarks} onChangeText={setMaxMarks} keyboardType="numeric" style={styles.input} />

              <Text style={styles.fieldLabel}>PASS MARKS</Text>
              <TextInput value={passMarks} onChangeText={setPassMarks} keyboardType="numeric" placeholder="Optional" style={styles.input} />

              <Text style={styles.fieldLabel}>EXAM DATE</Text>
              <TextInput value={examDate} onChangeText={setExamDate} placeholder="YYYY-MM-DD (optional)" style={styles.input} />

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ReadinessTab({ examId }: { examId: string }) {
  const readinessQuery = useQuery({ queryKey: ['coordinator-exam-readiness', examId], queryFn: () => getExamReadiness(examId) });
  const rows = readinessQuery.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={readinessQuery.isFetching} onRefresh={() => readinessQuery.refetch()} />}>
      {readinessQuery.isLoading ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.emptyText}>No classes configured for this exam yet.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((r) => {
            const pct = r.expectedCount > 0 ? Math.round((r.enteredCount / r.expectedCount) * 100) : 0;
            return (
              <View key={r.examSubjectId} style={styles.card}>
                <Text style={styles.cardTitle}>{r.subjectName} · {r.gradeName} {r.sectionName}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct === 100 ? facultyColors.green : pct > 0 ? facultyColors.amber : facultyColors.red }]} />
                  </View>
                  <Text style={styles.progressText}>{r.enteredCount}/{r.expectedCount}</Text>
                </View>
                <Text style={styles.cardMeta}>Verified {r.verifiedCount}/{r.expectedCount}</Text>
              </View>
            );
          })}
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
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16 },
  advanceButton: { backgroundColor: facultyColors.green, borderRadius: 12, paddingVertical: 12, marginHorizontal: 14, marginTop: 12, alignItems: 'center' },
  advanceButtonText: { color: '#fff', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  addButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  progressTrack: { flex: 1, height: 7, borderRadius: 999, backgroundColor: facultyColors.borderSoft, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.body },
  optionRow: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 },
  optionRowActive: { borderColor: facultyColors.blue, backgroundColor: facultyColors.blueLight },
  optionText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  optionTextActive: { color: facultyColors.blueDark },
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
