// Class Teacher -- class-advisor only. Real-time duty dashboard (attendance
// register status + pending leave approvals -- the two duties this schema
// actually backs) plus full CRUD over "Class Officers" (student_duty_
// assignment): search within this advisor's own section, select a student,
// give them a title/duties, and see everyone currently assigned at the
// bottom in a clean, arranged list.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { StatCards } from '@/components/faculty/StatCards';
import { TrashIcon, EditIcon, SearchIcon, CloseIcon, ChevronDownIcon } from '@/components/faculty/icons';
import { listAdvisorSections } from '@/lib/faculty-scope-api';
import {
  getDashboard,
  searchClassStudents,
  createDuty,
  updateDuty,
  deleteDuty,
  type StudentSearchResult,
  type StudentDuty,
} from '@/lib/faculty-class-teacher-api';
import { initialsOf } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

export default function ClassTeacherScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sectionOverride, setSectionOverride] = useState<string | null>(null);
  const [openDuty, setOpenDuty] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<StudentDuty | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [dutyTitle, setDutyTitle] = useState('');
  const [dutyDetails, setDutyDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const sectionsQuery = useQuery({ queryKey: ['faculty-advisor-sections'], queryFn: listAdvisorSections });
  const sectionKey = sectionOverride ?? sectionsQuery.data?.[0]?.sectionId ?? null;
  const options = useMemo(
    () => (sectionsQuery.data ?? []).map((s) => ({ key: s.sectionId, label: `${s.gradeName} - ${s.sectionName}` })),
    [sectionsQuery.data],
  );

  const dashboardQuery = useQuery({
    queryKey: ['faculty-class-teacher-dashboard', sectionKey],
    queryFn: () => getDashboard(sectionKey!),
    enabled: !!sectionKey,
  });

  const searchQuery = useQuery({
    queryKey: ['faculty-class-teacher-search', sectionKey, search],
    queryFn: () => searchClassStudents(sectionKey!, search),
    enabled: !!sectionKey && assignOpen && search.trim().length > 0,
  });

  function openAssign() {
    setEditingOfficer(null);
    setSelectedStudent(null);
    setSearch('');
    setDutyTitle('');
    setDutyDetails('');
    setAssignOpen(true);
  }

  function openEdit(officer: StudentDuty) {
    setEditingOfficer(officer);
    setSelectedStudent({ studentId: officer.studentId, studentName: officer.studentName, rollNo: officer.rollNo });
    setDutyTitle(officer.title);
    setDutyDetails(officer.duties ?? '');
    setAssignOpen(true);
  }

  async function handleAssign() {
    if (!selectedStudent || dutyTitle.trim().length === 0) return;
    setSaving(true);
    try {
      if (editingOfficer) {
        await updateDuty(editingOfficer.id, { title: dutyTitle.trim(), duties: dutyDetails.trim() || undefined });
      } else {
        if (!sectionKey) return;
        await createDuty(sectionKey, { studentId: selectedStudent.studentId, title: dutyTitle.trim(), duties: dutyDetails.trim() || undefined });
      }
      queryClient.invalidateQueries({ queryKey: ['faculty-class-teacher-dashboard', sectionKey] });
      setAssignOpen(false);
    } catch (err) {
      Alert.alert('Could not save duty', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmEnd(officerId: string, name: string) {
    Alert.alert('Remove this duty?', `${name} will no longer be assigned this role.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDuty(officerId);
            queryClient.invalidateQueries({ queryKey: ['faculty-class-teacher-dashboard', sectionKey] });
          } catch (err) {
            Alert.alert('Could not remove', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Class Teacher" subtitle={options.find((o) => o.key === sectionKey)?.label ?? ''} onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={dashboardQuery.isFetching} onRefresh={() => dashboardQuery.refetch()} />}
      >
        {sectionsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : options.length === 0 ? (
          <Text style={styles.emptyText}>You are not the class advisor for any section.</Text>
        ) : (
          <>
            <ClassSwitcher options={options} selectedKey={sectionKey} onSelect={setSectionOverride} />

            {dashboardQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : dashboardQuery.data ? (
              <>
                <StatCards
                  items={[
                    { label: 'STRENGTH', value: String(dashboardQuery.data.stats.strength) },
                    { label: 'TODAY', value: String(dashboardQuery.data.stats.presentToday) },
                    { label: 'ON LEAVE', value: String(dashboardQuery.data.stats.onLeaveToday) },
                  ]}
                />

                <Text style={styles.sectionLabel}>CLASS DUTIES</Text>
                <View style={{ gap: 8 }}>
                  {dashboardQuery.data.classDuties.map((duty) => {
                    const open = openDuty === duty.key;
                    return (
                      <View key={duty.key} style={styles.rowCard}>
                        <Pressable
                          style={styles.rowTop}
                          onPress={() => duty.pending && setOpenDuty(open ? null : duty.key)}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.rowTitle}>{duty.title}</Text>
                            <Text style={styles.rowMeta}>{duty.meta}</Text>
                          </View>
                          <View style={[styles.dutyBadge, duty.status === 'Done' && { backgroundColor: facultyColors.greenBg }]}>
                            <Text style={[styles.dutyBadgeText, duty.status === 'Done' && { color: facultyColors.greenDark }]}>{duty.status}</Text>
                          </View>
                          {duty.pending ? (
                            <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                              <ChevronDownIcon />
                            </View>
                          ) : null}
                        </Pressable>
                        {open && duty.pending && duty.pending.length > 0 ? (
                          <View style={styles.rowDetail}>
                            {duty.pending.map((p) => (
                              <Text key={p.id} style={styles.listLine}>{p.studentName} · {p.fromDate}–{p.toDate} · {p.reason}</Text>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.officersHeader}>
                  <Text style={styles.sectionLabel}>CLASS OFFICERS</Text>
                  <Pressable style={styles.assignButton} onPress={openAssign}>
                    <SearchIcon color="#fff" size={15} />
                    <Text style={styles.assignButtonText}>Assign Class Officer</Text>
                  </Pressable>
                </View>

                {dashboardQuery.data.officers.length === 0 ? (
                  <Text style={styles.emptyText}>No class officers assigned yet.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {dashboardQuery.data.officers.map((o) => (
                      <View key={o.id} style={styles.officerCard}>
                        <View style={styles.officerAvatar}>
                          <Text style={styles.officerInitials}>{initialsOf(o.studentName.split(' ')[0] ?? '', o.studentName.split(' ').slice(1).join(' '))}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.officerName}>{o.studentName} · {o.title}</Text>
                          <Text style={styles.officerMeta}>Roll {o.rollNo ?? '—'}{o.duties ? ` · ${o.duties}` : ''}</Text>
                        </View>
                        <View style={styles.officerActions}>
                          <Pressable hitSlop={8} onPress={() => openEdit(o)}>
                            <EditIcon />
                          </Pressable>
                          <Pressable hitSlop={8} onPress={() => confirmEnd(o.id, o.studentName)}>
                            <TrashIcon />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={assignOpen} animationType="slide" transparent onRequestClose={() => setAssignOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{editingOfficer ? 'Edit Class Officer' : 'Assign Class Officer'}</Text>
                  <Text style={styles.sheetSubtitle}>{editingOfficer ? 'Update their role or duties' : 'Search a student in this class'}</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setAssignOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              {!selectedStudent ? (
                <>
                  <View style={styles.searchBox}>
                    <SearchIcon />
                    <TextInput value={search} onChangeText={setSearch} placeholder="Search a student" style={styles.searchInput} />
                  </View>
                  {searchQuery.isLoading ? (
                    <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
                  ) : (
                    <View style={{ gap: 6, marginTop: 10 }}>
                      {(searchQuery.data ?? []).map((s) => (
                        <Pressable key={s.studentId} style={styles.searchResult} onPress={() => setSelectedStudent(s)}>
                          <Text style={styles.searchResultText}>{s.studentName}</Text>
                          <Text style={styles.searchResultRoll}>Roll {s.rollNo ?? '—'}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedName}>{selectedStudent.studentName}</Text>
                    {!editingOfficer ? (
                      <Pressable onPress={() => setSelectedStudent(null)}>
                        <Text style={styles.changeLink}>Change</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={styles.fieldLabel}>ROLE / TITLE</Text>
                  <TextInput value={dutyTitle} onChangeText={setDutyTitle} placeholder="e.g. Class Leader" style={styles.input} />

                  <Text style={styles.fieldLabel}>DUTIES</Text>
                  <TextInput
                    value={dutyDetails}
                    onChangeText={setDutyDetails}
                    placeholder="e.g. Attendance register handover and assembly line-up"
                    multiline
                    numberOfLines={3}
                    style={[styles.input, styles.textarea]}
                  />

                  <Pressable
                    style={[styles.postSubmit, dutyTitle.trim().length === 0 && styles.postSubmitDisabled]}
                    disabled={dutyTitle.trim().length === 0 || saving}
                    onPress={handleAssign}
                  >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.postSubmitText}>{editingOfficer ? 'Save changes' : 'Assign'}</Text>}
                  </Pressable>
                </>
              )}
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
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  rowCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, overflow: 'hidden' },
  rowTop: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  dutyBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: facultyColors.amberBg },
  dutyBadgeText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.amberDark },
  rowDetail: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, backgroundColor: facultyColors.rowBg, padding: 12, gap: 6 },
  listLine: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.ink },
  officersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  assignButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: facultyColors.blue, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13 },
  assignButtonText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  officerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 12 },
  officerActions: { flexDirection: 'row', gap: 14 },
  officerAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: facultyColors.blueLight, alignItems: 'center', justifyContent: 'center' },
  officerInitials: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  officerName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  officerMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  searchBox: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14, color: facultyColors.ink },
  searchResult: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 13, backgroundColor: facultyColors.rowBg, borderRadius: 12 },
  searchResultText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  searchResultRoll: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
  selectedBox: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: facultyColors.blueLight, borderRadius: 12, padding: 13 },
  selectedName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  changeLink: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blue },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  textarea: { height: 74, textAlignVertical: 'top' },
  postSubmit: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  postSubmitDisabled: { backgroundColor: facultyColors.disabled },
  postSubmitText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
