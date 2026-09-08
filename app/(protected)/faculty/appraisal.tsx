// Appraisal -- Faculty submits a self-assessment for a cycle, Principal
// reviews it (out of scope). Score/remark stay Principal-UI concerns not
// built here (see faculty-approval-handlers.service.ts's own note) -- shown
// as-is if a review has actually recorded them.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ApprovalTrail } from '@/components/faculty/ApprovalTrail';
import { PlusIcon, CloseIcon } from '@/components/faculty/icons';
import { listAppraisals, createAppraisal, type StaffAppraisal } from '@/lib/faculty-appraisal-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

export default function AppraisalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [cycle, setCycle] = useState('');
  const [selfAssessment, setSelfAssessment] = useState('');
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({ queryKey: ['faculty-appraisal'], queryFn: listAppraisals });
  const items = listQuery.data ?? [];

  function openComposer() {
    setCycle('');
    setSelfAssessment('');
    setComposerOpen(true);
  }

  const canSubmit = cycle.trim().length >= 4 && selfAssessment.trim().length >= 20;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createAppraisal({ cycle: cycle.trim(), selfAssessment: selfAssessment.trim() });
      queryClient.invalidateQueries({ queryKey: ['faculty-appraisal'] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not submit appraisal', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Appraisal" subtitle="Self-assessment & review" onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        <Pressable style={styles.applyButton} onPress={openComposer}>
          <PlusIcon />
          <Text style={styles.applyButtonText}>Submit self-assessment</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>MY APPRAISALS</Text>
        {listQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No appraisals submitted yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {items.map((a) => (
              <AppraisalRow key={a.id} appraisal={a} />
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
                  <Text style={styles.sheetTitle}>Submit self-assessment</Text>
                  <Text style={styles.sheetSubtitle}>Reviewed by the Principal</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>CYCLE</Text>
              <TextInput value={cycle} onChangeText={setCycle} placeholder="e.g. 2026-2027" style={styles.input} />

              <Text style={styles.fieldLabel}>SELF ASSESSMENT</Text>
              <TextInput
                value={selfAssessment}
                onChangeText={setSelfAssessment}
                placeholder="Describe your key contributions this cycle"
                multiline
                numberOfLines={5}
                style={[styles.input, styles.textarea]}
              />

              <Pressable style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} disabled={!canSubmit || saving} onPress={handleSubmit}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AppraisalRow({ appraisal }: { appraisal: StaffAppraisal }) {
  const reviewed = appraisal.state === 'REVIEWED';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle}>Cycle {appraisal.cycle}</Text>
          <Text style={styles.cardMeta}>Submitted {formatDate(appraisal.createdAt)}</Text>
        </View>
        <View style={[styles.stateBadge, reviewed && { backgroundColor: facultyColors.greenBg }]}>
          <Text style={[styles.stateBadgeText, reviewed && { color: facultyColors.greenDark }]}>{reviewed ? 'Reviewed' : 'Submitted'}</Text>
        </View>
      </View>
      <Text style={styles.cardBody} numberOfLines={3}>{appraisal.selfAssessment}</Text>
      {reviewed && (appraisal.score !== null || appraisal.principalRemark) ? (
        <View style={styles.reviewBox}>
          {appraisal.score !== null ? <Text style={styles.reviewLine}>Score: {appraisal.score}</Text> : null}
          {appraisal.principalRemark ? <Text style={styles.reviewLine}>{appraisal.principalRemark}</Text> : null}
        </View>
      ) : null}
      <ApprovalTrail steps={appraisal.approvalTrail} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16 },
  applyButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  applyButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 15 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  cardBody: { fontSize: 13, color: facultyColors.body, lineHeight: 19, marginTop: 9, fontFamily: 'PlusJakartaSans_500Medium' },
  stateBadge: { backgroundColor: facultyColors.amberBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  stateBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.amberDark },
  reviewBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, paddingTop: 9, gap: 4 },
  reviewLine: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.bodyMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  textarea: { height: 120, textAlignVertical: 'top' },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
