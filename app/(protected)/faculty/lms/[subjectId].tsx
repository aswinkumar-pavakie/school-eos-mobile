// Current Term (LMS) -- subject detail. Materials: real sub-folders, each
// with its own independently-editable per-class share list (subject-wide,
// not per-class). Tasks and Lesson Plans: scoped per-class (subject_offering)
// -- switching the class switcher shows a wholly separate list, and creating
// one creates it only for the selected class, never shared across classes.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { PlusIcon, TrashIcon, EditIcon, CloseIcon, FolderIcon, ChevronRightIcon } from '@/components/faculty/icons';
import {
  listLmsSubjects,
  listLmsFolders,
  createLmsFolder,
  listLmsTasks,
  createLmsTask,
  updateLmsTask,
  deleteLmsTask,
  listLmsLessonPlans,
  createLmsLessonPlan,
  updateLmsLessonPlan,
  deleteLmsLessonPlan,
  type LmsTask,
  type LmsLessonPlan,
} from '@/lib/faculty-lms-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

type Tab = 'MATERIALS' | 'TASKS' | 'PLANS';
type ClassInfo = { subjectOfferingId: string; gradeName: string; sectionName: string };

export default function LmsSubjectDetailScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('MATERIALS');

  const subjectsQuery = useQuery({ queryKey: ['faculty-lms-subjects'], queryFn: listLmsSubjects });
  const subject = subjectsQuery.data?.find((s) => s.subjectId === subjectId);
  const classes: ClassInfo[] = subject?.classes ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader
        title={subject?.subjectName ?? 'Subject'}
        subtitle={subjectsQuery.isLoading ? '' : `${classes.length} class${classes.length === 1 ? '' : 'es'}`}
        onBack={() => router.replace('/faculty/lms' as never)}
      />
      <View style={styles.tabRow}>
        {(['MATERIALS', 'TASKS', 'PLANS'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'MATERIALS' ? 'Materials' : t === 'TASKS' ? 'Tasks' : 'Lesson Plans'}
            </Text>
          </Pressable>
        ))}
      </View>

      {subjectsQuery.isLoading || !subjectId ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : tab === 'MATERIALS' ? (
        <MaterialsTab subjectId={subjectId} classes={classes} />
      ) : tab === 'TASKS' ? (
        <TasksTab classes={classes} />
      ) : (
        <LessonPlansTab classes={classes} />
      )}
    </View>
  );
}

function MaterialsTab({ subjectId, classes }: { subjectId: string; classes: ClassInfo[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shareIds, setShareIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const foldersQuery = useQuery({ queryKey: ['faculty-lms-folders', subjectId], queryFn: () => listLmsFolders(subjectId) });
  const folders = foldersQuery.data ?? [];

  function openComposer() {
    setTitle('');
    setDescription('');
    setShareIds(classes.map((c) => c.subjectOfferingId));
    setComposerOpen(true);
  }

  function toggleShare(id: string) {
    setShareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const canSave = title.trim().length > 0 && shareIds.length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await createLmsFolder({ subjectId, title: title.trim(), description: description.trim() || undefined, shareOfferingIds: shareIds });
      queryClient.invalidateQueries({ queryKey: ['faculty-lms-folders', subjectId] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not create folder', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={foldersQuery.isFetching} onRefresh={() => foldersQuery.refetch()} />}>
      <Pressable style={styles.addButton} onPress={openComposer}>
        <PlusIcon />
        <Text style={styles.addButtonText}>New folder</Text>
      </Pressable>

      {foldersQuery.isLoading ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : folders.length === 0 ? (
        <Text style={styles.emptyText}>No material folders yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {folders.map((f) => (
            <Pressable key={f.id} style={styles.folderCard} onPress={() => router.push(`/faculty/lms/folder/${f.id}` as never)}>
              <View style={styles.folderIconBox}>
                <FolderIcon />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.folderTitle} numberOfLines={1}>{f.title}</Text>
                <Text style={styles.folderMeta}>
                  {f.files.length} file{f.files.length === 1 ? '' : 's'} · shared with {f.shareOfferingIds.length} class{f.shareOfferingIds.length === 1 ? '' : 'es'}
                </Text>
              </View>
              <ChevronRightIcon color={facultyColors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>New folder</Text>
                  <Text style={styles.sheetSubtitle}>Visible only to the classes you share it with</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Unit 1" style={styles.input} />

              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={3} style={[styles.input, styles.textarea]} />

              <Text style={styles.fieldLabel}>SHARE WITH</Text>
              <View style={{ gap: 8 }}>
                {classes.map((c) => {
                  const checked = shareIds.includes(c.subjectOfferingId);
                  return (
                    <Pressable key={c.subjectOfferingId} style={[styles.shareRow, checked && styles.shareRowChecked]} onPress={() => toggleShare(c.subjectOfferingId)}>
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                      </View>
                      <Text style={styles.shareRowText}>{c.gradeName} {c.sectionName}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create folder</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function TasksTab({ classes }: { classes: ClassInfo[] }) {
  const queryClient = useQueryClient();
  const [offeringOverride, setOfferingOverride] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<LmsTask | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const offeringKey = offeringOverride ?? classes[0]?.subjectOfferingId ?? null;
  const options = classes.map((c) => ({ key: c.subjectOfferingId, label: `${c.gradeName} ${c.sectionName}` }));

  const tasksQuery = useQuery({
    queryKey: ['faculty-lms-tasks', offeringKey],
    queryFn: () => listLmsTasks(offeringKey!),
    enabled: !!offeringKey,
  });
  const tasks = tasksQuery.data ?? [];

  function openComposer(task?: LmsTask) {
    if (task) {
      setEditing(task);
      setTitle(task.title);
      setDescription(task.description ?? '');
      setDueDate(task.dueDate?.slice(0, 10) ?? '');
    } else {
      setEditing(null);
      setTitle('');
      setDescription('');
      setDueDate('');
    }
    setComposerOpen(true);
  }

  const canSave = title.trim().length > 0;

  async function handleSave() {
    if (!canSave || !offeringKey) return;
    setSaving(true);
    try {
      if (editing) {
        await updateLmsTask(editing.id, { title: title.trim(), description: description.trim() || undefined, dueDate: dueDate.trim() || undefined });
      } else {
        await createLmsTask({ subjectOfferingId: offeringKey, title: title.trim(), description: description.trim() || undefined, dueDate: dueDate.trim() || undefined });
      }
      queryClient.invalidateQueries({ queryKey: ['faculty-lms-tasks', offeringKey] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not save task', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(task: LmsTask) {
    Alert.alert('Delete this task?', `"${task.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLmsTask(task.id);
            queryClient.invalidateQueries({ queryKey: ['faculty-lms-tasks', offeringKey] });
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  async function toggleStatus(task: LmsTask) {
    try {
      await updateLmsTask(task.id, { status: task.status === 'OPEN' ? 'CLOSED' : 'OPEN' });
      queryClient.invalidateQueries({ queryKey: ['faculty-lms-tasks', offeringKey] });
    } catch (err) {
      Alert.alert('Could not update task', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={tasksQuery.isFetching} onRefresh={() => tasksQuery.refetch()} />}>
      <ClassSwitcher label="CLASS" options={options} selectedKey={offeringKey} onSelect={setOfferingOverride} />

      <Pressable style={styles.addButton} onPress={() => openComposer()}>
        <PlusIcon />
        <Text style={styles.addButtonText}>New task</Text>
      </Pressable>

      {tasksQuery.isLoading ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : tasks.length === 0 ? (
        <Text style={styles.emptyText}>No tasks for this class yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {tasks.map((t) => (
            <View key={t.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{t.title}</Text>
                  {t.dueDate ? <Text style={styles.itemMeta}>Due {formatDate(t.dueDate)}</Text> : null}
                </View>
                <Pressable hitSlop={8} onPress={() => openComposer(t)}><EditIcon /></Pressable>
                <Pressable hitSlop={8} onPress={() => confirmDelete(t)}><TrashIcon /></Pressable>
              </View>
              {t.description ? <Text style={styles.itemBody}>{t.description}</Text> : null}
              <Pressable style={[styles.statusBadge, t.status === 'CLOSED' && styles.statusBadgeClosed]} onPress={() => toggleStatus(t)}>
                <Text style={[styles.statusBadgeText, t.status === 'CLOSED' && styles.statusBadgeTextClosed]}>{t.status === 'OPEN' ? 'Open' : 'Closed'}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{editing ? 'Edit task' : 'New task'}</Text>
                  <Text style={styles.sheetSubtitle}>{options.find((o) => o.key === offeringKey)?.label ?? ''}</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Worksheet 3" style={styles.input} />

              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={3} style={[styles.input, styles.textarea]} />

              <Text style={styles.fieldLabel}>DUE DATE</Text>
              <TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD (optional)" style={styles.input} />

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editing ? 'Save changes' : 'Create task'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function LessonPlansTab({ classes }: { classes: ClassInfo[] }) {
  const queryClient = useQueryClient();
  const [offeringOverride, setOfferingOverride] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<LmsLessonPlan | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [saving, setSaving] = useState(false);

  const offeringKey = offeringOverride ?? classes[0]?.subjectOfferingId ?? null;
  const options = classes.map((c) => ({ key: c.subjectOfferingId, label: `${c.gradeName} ${c.sectionName}` }));

  const plansQuery = useQuery({
    queryKey: ['faculty-lms-lesson-plans', offeringKey],
    queryFn: () => listLmsLessonPlans(offeringKey!),
    enabled: !!offeringKey,
  });
  const plans = plansQuery.data ?? [];

  function openComposer(plan?: LmsLessonPlan) {
    if (plan) {
      setEditing(plan);
      setTitle(plan.title);
      setContent(plan.content);
      setWeekStart(plan.weekStart?.slice(0, 10) ?? '');
    } else {
      setEditing(null);
      setTitle('');
      setContent('');
      setWeekStart('');
    }
    setComposerOpen(true);
  }

  const canSave = title.trim().length > 0 && content.trim().length > 0;

  async function handleSave() {
    if (!canSave || !offeringKey) return;
    setSaving(true);
    try {
      if (editing) {
        await updateLmsLessonPlan(editing.id, { title: title.trim(), content: content.trim(), weekStart: weekStart.trim() || undefined });
      } else {
        await createLmsLessonPlan({ subjectOfferingId: offeringKey, title: title.trim(), content: content.trim(), weekStart: weekStart.trim() || undefined });
      }
      queryClient.invalidateQueries({ queryKey: ['faculty-lms-lesson-plans', offeringKey] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not save lesson plan', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(plan: LmsLessonPlan) {
    Alert.alert('Delete this lesson plan?', `"${plan.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLmsLessonPlan(plan.id);
            queryClient.invalidateQueries({ queryKey: ['faculty-lms-lesson-plans', offeringKey] });
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={plansQuery.isFetching} onRefresh={() => plansQuery.refetch()} />}>
      <ClassSwitcher label="CLASS" options={options} selectedKey={offeringKey} onSelect={setOfferingOverride} />

      <Pressable style={styles.addButton} onPress={() => openComposer()}>
        <PlusIcon />
        <Text style={styles.addButtonText}>New lesson plan</Text>
      </Pressable>

      {plansQuery.isLoading ? (
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
      ) : plans.length === 0 ? (
        <Text style={styles.emptyText}>No lesson plans for this class yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {plans.map((p) => (
            <View key={p.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{p.title}</Text>
                  {p.weekStart ? <Text style={styles.itemMeta}>Week of {formatDate(p.weekStart)}</Text> : null}
                </View>
                <Pressable hitSlop={8} onPress={() => openComposer(p)}><EditIcon /></Pressable>
                <Pressable hitSlop={8} onPress={() => confirmDelete(p)}><TrashIcon /></Pressable>
              </View>
              <Text style={styles.itemBody}>{p.content}</Text>
            </View>
          ))}
        </View>
      )}

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{editing ? 'Edit lesson plan' : 'New lesson plan'}</Text>
                  <Text style={styles.sheetSubtitle}>{options.find((o) => o.key === offeringKey)?.label ?? ''}</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Week 3 — Photosynthesis" style={styles.input} />

              <Text style={styles.fieldLabel}>WEEK OF</Text>
              <TextInput value={weekStart} onChangeText={setWeekStart} placeholder="YYYY-MM-DD (optional)" style={styles.input} />

              <Text style={styles.fieldLabel}>CONTENT</Text>
              <TextInput value={content} onChangeText={setContent} placeholder="Plan details" multiline numberOfLines={6} style={[styles.input, styles.textareaLg]} />

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editing ? 'Save changes' : 'Create lesson plan'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  folderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 14 },
  folderIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: facultyColors.blueLight, alignItems: 'center', justifyContent: 'center' },
  folderTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  folderMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  itemCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 14 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  itemMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  itemBody: { fontSize: 13, color: facultyColors.body, lineHeight: 19, marginTop: 8, fontFamily: 'PlusJakartaSans_500Medium' },
  statusBadge: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: facultyColors.blueLight, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  statusBadgeClosed: { backgroundColor: facultyColors.borderSoft },
  statusBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  statusBadgeTextClosed: { color: facultyColors.mutedStrong },
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
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  textarea: { height: 74, textAlignVertical: 'top' },
  textareaLg: { height: 140, textAlignVertical: 'top' },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
