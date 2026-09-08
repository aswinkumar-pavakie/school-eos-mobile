// Homework -- teaching-offering scoped, full CRUD (create/edit/delete),
// pixel-matches the design's stat row + filter chips + expandable cards with
// a Completed/Not-submitted roster tab. "Mark completed"/"Remind" buttons
// from the static mock are dropped -- even the design itself never wires
// them to real data (pure toasts), and actual submission is the
// Parent/Student app's own job.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { StatCards } from '@/components/faculty/StatCards';
import { PlusIcon, TrashIcon, EditIcon, CloseIcon, ChevronDownIcon, CheckCircleIcon, ClockIcon } from '@/components/faculty/icons';
import {
  listHomework,
  createHomework,
  updateHomework,
  deleteHomework,
  getHomeworkRoster,
  type HomeworkItem,
} from '@/lib/faculty-homework-api';
import { formatDate, initialsOf } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeworkScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [classFilter, setClassFilter] = useState<string | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [tabByHw, setTabByHw] = useState<Record<string, 'DONE' | 'NOT_DONE'>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [classKey, setClassKey] = useState<string | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({ queryKey: ['faculty-homework'], queryFn: listHomework });
  const items = listQuery.data?.items ?? [];
  const classes = listQuery.data?.classes ?? [];
  const filtered = classFilter === 'all' ? items : items.filter((h) => h.subjectOfferingId === classFilter);

  function openComposer(hw?: HomeworkItem) {
    if (hw) {
      setEditing(hw);
      setTitle(hw.title);
      setDescription(hw.description ?? '');
      setDueDate(hw.dueDate.slice(0, 10));
      setClassKey(hw.subjectOfferingId);
    } else {
      setEditing(null);
      setTitle('');
      setDescription('');
      setDueDate('');
      setClassKey(classes[0]?.subjectOfferingId ?? null);
    }
    setComposerOpen(true);
  }

  const canPost = title.trim().length > 0 && dueDate.trim().length > 0 && !!classKey;

  async function handlePost() {
    if (!canPost || !classKey) return;
    setSaving(true);
    try {
      if (editing) {
        await updateHomework(editing.id, { title: title.trim(), description: description.trim() || undefined, dueDate });
      } else {
        await createHomework({ subjectOfferingId: classKey, title: title.trim(), description: description.trim() || undefined, dueDate });
      }
      queryClient.invalidateQueries({ queryKey: ['faculty-homework'] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not save assignment', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(hw: HomeworkItem) {
    Alert.alert('Delete assignment?', `"${hw.title}" and every student's submission record will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHomework(hw.id);
            queryClient.invalidateQueries({ queryKey: ['faculty-homework'] });
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Homework" subtitle="Assigned across my classes" onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        {listQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            {listQuery.data ? (
              <StatCards
                items={[
                  { label: 'OPEN', value: String(listQuery.data.stats.open) },
                  { label: 'DUE TODAY', value: String(listQuery.data.stats.dueToday) },
                  { label: 'UNGRADED', value: String(listQuery.data.stats.ungraded) },
                ]}
              />
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable style={[styles.chip, classFilter === 'all' && styles.chipActive]} onPress={() => setClassFilter('all')}>
                <Text style={[styles.chipText, classFilter === 'all' && styles.chipTextActive]}>All</Text>
              </Pressable>
              {classes.map((c) => {
                const active = classFilter === c.subjectOfferingId;
                return (
                  <Pressable key={c.subjectOfferingId} style={[styles.chip, active && styles.chipActive]} onPress={() => setClassFilter(c.subjectOfferingId)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.postButton} onPress={() => openComposer()}>
              <PlusIcon />
              <Text style={styles.postButtonText}>Post new assignment</Text>
            </Pressable>

            <View style={{ gap: 10 }}>
              {filtered.map((hw) => (
                <HomeworkCard
                  key={hw.id}
                  hw={hw}
                  open={openId === hw.id}
                  tab={tabByHw[hw.id] ?? 'DONE'}
                  onToggle={() => setOpenId((id) => (id === hw.id ? null : hw.id))}
                  onTab={(t) => setTabByHw((m) => ({ ...m, [hw.id]: t }))}
                  onEdit={() => openComposer(hw)}
                  onDelete={() => confirmDelete(hw)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{editing ? 'Edit assignment' : 'New assignment'}</Text>
                  <Text style={styles.sheetSubtitle}>Posted to the class you select</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Worksheet 5 — Graphs" style={styles.input} />

              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={3} style={[styles.input, styles.textarea]} />

              <Text style={styles.fieldLabel}>CLASS</Text>
              <Pressable style={styles.picker} onPress={() => !editing && setClassPickerOpen((o) => !o)} disabled={!!editing}>
                <Text style={styles.pickerText}>{classes.find((c) => c.subjectOfferingId === classKey)?.label ?? 'Select a class'}</Text>
                {!editing ? <ChevronDownIcon /> : null}
              </Pressable>
              {classPickerOpen ? (
                <View style={styles.pickerDropdown}>
                  {classes.map((c) => (
                    <Pressable key={c.subjectOfferingId} style={styles.pickerOption} onPress={() => { setClassKey(c.subjectOfferingId); setClassPickerOpen(false); }}>
                      <Text style={styles.pickerOptionText}>{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>DUE DATE</Text>
              <TextInput value={dueDate} onChangeText={setDueDate} placeholder={`YYYY-MM-DD (today is ${todayIso()})`} style={styles.input} />

              <Pressable style={[styles.postSubmit, !canPost && styles.postSubmitDisabled]} disabled={!canPost || saving} onPress={handlePost}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.postSubmitText}>{editing ? 'Save changes' : 'Post assignment'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HomeworkCard({
  hw,
  open,
  tab,
  onToggle,
  onTab,
  onEdit,
  onDelete,
}: {
  hw: HomeworkItem;
  open: boolean;
  tab: 'DONE' | 'NOT_DONE';
  onToggle: () => void;
  onTab: (t: 'DONE' | 'NOT_DONE') => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rosterQuery = useQuery({
    queryKey: ['faculty-homework-roster', hw.id, tab],
    queryFn: () => getHomeworkRoster(hw.id, tab),
    enabled: open,
  });
  const pct = hw.total > 0 ? Math.round((hw.finishedCount / hw.total) * 100) : 0;
  const isPastDue = hw.dueDate < todayIso();

  return (
    <View style={styles.hwCard}>
      <Pressable style={styles.hwTop} onPress={onToggle}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.hwTitleRow}>
            <Text style={styles.hwTitle} numberOfLines={1}>{hw.title}</Text>
            <Pressable hitSlop={8} onPress={onEdit}><EditIcon /></Pressable>
            <Pressable hitSlop={8} onPress={onDelete}><TrashIcon /></Pressable>
          </View>
          <Text style={styles.hwSubject}>{hw.subjectName} · {hw.gradeName} {hw.sectionName}</Text>
        </View>
        <View style={[styles.dueBadge, isPastDue && { backgroundColor: facultyColors.borderSoft }]}>
          <Text style={[styles.dueBadgeText, isPastDue && { color: facultyColors.mutedStrong }]}>
            {isPastDue ? 'Closed' : `Due ${formatDate(hw.dueDate)}`}
          </Text>
        </View>
      </Pressable>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct === 100 ? facultyColors.green : pct >= 75 ? facultyColors.blue : facultyColors.amber }]} />
        </View>
        <Text style={styles.progressText}>{hw.finishedCount}/{hw.total}</Text>
      </View>

      {open ? (
        <View style={styles.hwDetail}>
          <View style={styles.miniStatRow}>
            <MiniStat label="SUBMITTED" value={`${pct}%`} color={facultyColors.ink} />
            <MiniStat label="PENDING" value={String(hw.total - hw.finishedCount)} color={facultyColors.redDark} />
            <MiniStat label="GRADED" value={`${hw.gradedCount}/${hw.finishedCount}`} color={facultyColors.ink} />
          </View>

          <View style={styles.tabRow}>
            <Pressable style={[styles.tab, tab === 'DONE' && styles.tabActive]} onPress={() => onTab('DONE')}>
              <Text style={[styles.tabText, tab === 'DONE' && styles.tabTextActive]}>Completed</Text>
            </Pressable>
            <Pressable style={[styles.tab, tab === 'NOT_DONE' && styles.tabActive]} onPress={() => onTab('NOT_DONE')}>
              <Text style={[styles.tabText, tab === 'NOT_DONE' && styles.tabTextActive]}>Not submitted</Text>
            </Pressable>
          </View>

          {rosterQuery.isLoading ? (
            <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 10 }} />
          ) : (rosterQuery.data?.roster ?? []).length === 0 ? (
            <Text style={styles.rosterEmpty}>{tab === 'DONE' ? 'No submissions yet' : 'Everyone has submitted'}</Text>
          ) : (
            <View style={{ gap: 7, marginTop: 10 }}>
              {(rosterQuery.data?.roster ?? []).map((r) => (
                <View key={r.studentId} style={styles.rosterRow}>
                  <View style={[styles.rosterAvatar, { backgroundColor: tab === 'DONE' ? facultyColors.greenBg : facultyColors.amberBg }]}>
                    <Text style={[styles.rosterInitials, { color: tab === 'DONE' ? facultyColors.greenDark : facultyColors.amberDark }]}>
                      {initialsOf(r.studentName.split(' ')[0] ?? '', r.studentName.split(' ').slice(1).join(' '))}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rosterName} numberOfLines={1}>{r.studentName}</Text>
                    <Text style={styles.rosterNote}>Roll {r.rollNo ?? '—'} · {r.status === 'GRADED' ? `Graded${r.marksAwarded !== null ? ` · ${r.marksAwarded}` : ''}` : r.status === 'LATE' ? 'Submitted late' : r.status === 'SUBMITTED' ? 'Submitted' : 'Not submitted yet'}</Text>
                  </View>
                  {tab === 'DONE' ? <CheckCircleIcon /> : <ClockIcon />}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
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
  postButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  postButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  hwCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, overflow: 'hidden' },
  hwTop: { padding: 15, paddingBottom: 14 },
  hwTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hwTitle: { flex: 1, fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  hwSubject: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 4 },
  dueBadge: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: facultyColors.blueLight, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  dueBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingBottom: 14 },
  progressTrack: { flex: 1, height: 7, borderRadius: 999, backgroundColor: facultyColors.borderSoft, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.body },
  hwDetail: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, backgroundColor: facultyColors.rowBg, padding: 13 },
  miniStatRow: { flexDirection: 'row', gap: 8 },
  miniStat: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderSoft, borderRadius: 10, padding: 9 },
  miniStatLabel: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.8 },
  miniStatValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 3 },
  tabRow: { flexDirection: 'row', gap: 6, backgroundColor: facultyColors.chipTrack, borderRadius: 11, padding: 4, marginTop: 13 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.mutedStrong },
  tabTextActive: { color: facultyColors.blueDark },
  rosterEmpty: { textAlign: 'center', fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, paddingVertical: 14 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderSoft, borderRadius: 12, padding: 10 },
  rosterAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rosterInitials: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  rosterName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rosterNote: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  textarea: { height: 74, textAlignVertical: 'top' },
  picker: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  pickerDropdown: { marginTop: 6, borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, overflow: 'hidden' },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: facultyColors.borderSoft },
  pickerOptionText: { fontSize: 13.5, color: facultyColors.body },
  postSubmit: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  postSubmitDisabled: { backgroundColor: facultyColors.disabled },
  postSubmitText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
