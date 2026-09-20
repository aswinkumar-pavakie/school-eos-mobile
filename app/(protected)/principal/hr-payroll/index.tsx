// Principal -> HR Payroll -- real backend now (faculty-hr-requests.controller.ts
// broadened 2026-09 to @Roles('FACULTY', 'PRINCIPAL'), confirmed by a real
// live create+withdraw round trip against the running backend -- see
// principal-hr-requests-api.ts's own comment). Adapted from the Faculty
// module's own real screen (app/(protected)/faculty/hr-requests.tsx) --
// same real data, same real approval flow (PRINCIPAL then FINANCE), just on
// this module's own principalColors/PrincipalHeader.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { ApprovalTrail } from '@/components/faculty/ApprovalTrail';
import { StatCards } from '@/components/principal/StatCards';
import { PlusIcon, CloseIcon } from '@/components/principal/icons';
import {
  listHrRequests,
  createHrRequest,
  HR_CATEGORY_LABELS,
  type HrRequestCategory,
  type StaffHrRequest,
} from '@/lib/principal-hr-requests-api';
import { formatDate } from '@/lib/format';
import { principalColors } from '@/lib/theme';

const CATEGORIES = Object.keys(HR_CATEGORY_LABELS) as HrRequestCategory[];

function statusColors(state: string) {
  if (state === 'APPROVED') return { bg: principalColors.greenBg, fg: principalColors.green, label: 'Approved' };
  if (state === 'REJECTED') return { bg: principalColors.redBg, fg: principalColors.red, label: 'Rejected' };
  return { bg: principalColors.tint6, fg: principalColors.primaryDark, label: 'Pending' };
}

export default function PrincipalHRPayrollScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [category, setCategory] = useState<HrRequestCategory>('SALARY_QUERY');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({ queryKey: ['principal-hr-requests'], queryFn: listHrRequests });
  const items = listQuery.data ?? [];

  function openComposer() {
    setCategory('SALARY_QUERY');
    setSubject('');
    setDescription('');
    setComposerOpen(true);
  }

  const canSubmit = subject.trim().length >= 2;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createHrRequest({ category, subject: subject.trim(), description: description.trim() || undefined });
      queryClient.invalidateQueries({ queryKey: ['principal-hr-requests'] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not submit request', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="HR Payroll" subtitle="Payroll & HR queries" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        <StatCards
          items={[
            { label: 'Pending', value: String(items.filter((r) => r.state === 'PENDING').length) },
            { label: 'Approved', value: String(items.filter((r) => r.state === 'APPROVED').length) },
            { label: 'Rejected', value: String(items.filter((r) => r.state === 'REJECTED').length) },
          ]}
        />

        <Pressable style={styles.applyButton} onPress={openComposer}>
          <PlusIcon />
          <Text style={styles.applyButtonText}>New HR request</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>MY REQUESTS</Text>
        {listQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 16 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No requests yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {items.map((r) => (
              <HrRow key={r.id} request={r} />
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
                  <Text style={styles.sheetTitle}>New HR request</Text>
                  <Text style={styles.sheetSubtitle}>Reviewed by Principal, then Finance</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((c) => {
                  const active = category === c;
                  return (
                    <Pressable key={c} style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={() => setCategory(c)}>
                      <Text style={[styles.categoryChipText, active && { color: '#fff' }]}>{HR_CATEGORY_LABELS[c]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>SUBJECT</Text>
              <TextInput value={subject} onChangeText={setSubject} placeholder="e.g. Update salary account to new bank" style={styles.input} />

              <Text style={styles.fieldLabel}>DETAILS</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={3} style={[styles.input, styles.textarea]} />

              <Pressable style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} disabled={!canSubmit || saving} onPress={handleSubmit}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit request</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HrRow({ request }: { request: StaffHrRequest }) {
  const colors = statusColors(request.state);
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{request.subject}</Text>
          <Text style={styles.rowMeta}>{HR_CATEGORY_LABELS[request.category]} · {formatDate(request.createdAt)}</Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.stateBadgeText, { color: colors.fg }]}>{colors.label}</Text>
        </View>
      </View>
      <ApprovalTrail steps={request.approvalTrail} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: principalColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16 },
  applyButton: { backgroundColor: principalColors.primary, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  applyButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  row: { backgroundColor: principalColors.surface, borderWidth: 1, borderColor: principalColors.border, borderRadius: 14, padding: 13 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 3 },
  stateBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  stateBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,27,51,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: principalColors.body, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: principalColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: principalColors.border },
  categoryChipActive: { backgroundColor: principalColors.primary, borderColor: principalColors.primary },
  categoryChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.body },
  input: { borderWidth: 1, borderColor: principalColors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: principalColors.ink },
  textarea: { height: 74, textAlignVertical: 'top' },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: principalColors.primary },
  submitBtnDisabled: { backgroundColor: principalColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
