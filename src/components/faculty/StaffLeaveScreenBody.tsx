// Shared body for Employee Leave and OD -- same real staff_leave_request
// table, same actions, just scoped to a different subset of leave_type
// values (and OD gets its own request form, mirroring Leave's own Apply
// pattern -- the design itself has no OD request form at all, read-only
// list only). The design's own "used/allotted" stats (e.g. "6/12") and its
// SUBSTITUTION section are dropped -- there is no leave-quota or cover-
// teacher table anywhere in this schema, and fabricating those numbers
// would mean inventing data. Real request-count stats stand in instead.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApprovalTrail } from './ApprovalTrail';
import { StatCards } from './StatCards';
import { PlusIcon, CloseIcon } from './icons';
import {
  listStaffLeaveRequests,
  createStaffLeaveRequest,
  type StaffLeaveRequest,
  type StaffLeaveType,
} from '@/lib/faculty-staff-leave-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

function statusColors(state: string) {
  if (state === 'APPROVED') return { bg: facultyColors.greenBg, fg: facultyColors.greenDark };
  if (state === 'REJECTED') return { bg: facultyColors.redBg, fg: facultyColors.redDark };
  return { bg: facultyColors.amberBg, fg: facultyColors.amberDark };
}

export function StaffLeaveScreenBody({ mode }: { mode: 'LEAVE' | 'OD' }) {
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<StaffLeaveType>(mode === 'OD' ? 'ON_DUTY' : 'CASUAL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({ queryKey: ['faculty-staff-leave'], queryFn: listStaffLeaveRequests });
  const relevant = (listQuery.data ?? []).filter((r) => (mode === 'OD' ? r.leaveType === 'ON_DUTY' : r.leaveType !== 'ON_DUTY'));

  const stats =
    mode === 'OD'
      ? [
          { label: 'THIS TERM', value: String(relevant.length) },
          { label: 'APPROVED', value: String(relevant.filter((r) => r.state === 'APPROVED').length) },
          { label: 'PENDING', value: String(relevant.filter((r) => r.state === 'PENDING').length) },
        ]
      : [
          { label: 'CASUAL', value: String(relevant.filter((r) => r.leaveType === 'CASUAL').length) },
          { label: 'EARNED', value: String(relevant.filter((r) => r.leaveType === 'EARNED').length) },
          { label: 'MEDICAL', value: String(relevant.filter((r) => r.leaveType === 'MEDICAL').length) },
        ];

  function openApply() {
    setLeaveType(mode === 'OD' ? 'ON_DUTY' : 'CASUAL');
    setFromDate('');
    setToDate('');
    setReason('');
    setApplyOpen(true);
  }

  const canSubmit = fromDate.trim().length > 0 && toDate.trim().length > 0 && reason.trim().length >= 3;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createStaffLeaveRequest({ leaveType, fromDate, toDate, reason: reason.trim() });
      queryClient.invalidateQueries({ queryKey: ['faculty-staff-leave'] });
      setApplyOpen(false);
    } catch (err) {
      Alert.alert('Could not submit request', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        <StatCards items={stats} />

        <Pressable style={styles.applyButton} onPress={openApply}>
          <PlusIcon />
          <Text style={styles.applyButtonText}>{mode === 'OD' ? 'Request on-duty' : 'Apply for leave'}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>{mode === 'OD' ? 'REQUESTS' : 'MY REQUESTS'}</Text>
        {listQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
        ) : relevant.length === 0 ? (
          <Text style={styles.emptyText}>No requests yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {relevant.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={applyOpen} animationType="slide" transparent onRequestClose={() => setApplyOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{mode === 'OD' ? 'Request on-duty' : 'Apply for leave'}</Text>
                  <Text style={styles.sheetSubtitle}>Goes to the Principal for approval</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setApplyOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              {mode === 'LEAVE' ? (
                <>
                  <Text style={styles.fieldLabel}>LEAVE TYPE</Text>
                  <View style={styles.typeRow}>
                    {(['CASUAL', 'MEDICAL', 'EARNED'] as StaffLeaveType[]).map((t) => {
                      const active = leaveType === t;
                      return (
                        <Pressable key={t} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setLeaveType(t)}>
                          <Text style={[styles.typeChipText, active && { color: '#fff' }]}>{t}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={styles.fieldLabel}>FROM DATE</Text>
              <TextInput value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" style={styles.input} />

              <Text style={styles.fieldLabel}>TO DATE</Text>
              <TextInput value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" style={styles.input} />

              <Text style={styles.fieldLabel}>{mode === 'OD' ? 'PURPOSE' : 'REASON'}</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder={mode === 'OD' ? 'e.g. District Maths olympiad escort' : 'e.g. Family function'}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textarea]}
              />

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

function RequestRow({ request }: { request: StaffLeaveRequest }) {
  const colors = statusColors(request.state);
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle}>
            {request.leaveType === 'ON_DUTY' ? 'On-duty' : `${request.leaveType.charAt(0)}${request.leaveType.slice(1).toLowerCase()} leave`} · {formatDate(request.fromDate)}
            {request.fromDate !== request.toDate ? `–${formatDate(request.toDate)}` : ''}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>{request.reason}</Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.stateBadgeText, { color: colors.fg }]}>{request.state}</Text>
        </View>
      </View>
      <ApprovalTrail steps={request.approvalTrail} />
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
  row: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  stateBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  stateBadgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: facultyColors.borderLight },
  typeChipActive: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  typeChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  textarea: { height: 74, textAlignVertical: 'top' },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
