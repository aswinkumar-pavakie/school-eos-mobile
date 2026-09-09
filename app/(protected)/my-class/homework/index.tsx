// Parent "Homework" -- pixel-matched to the design reference's isHomework block
// (day-picker + 3-stat card + status filter chips + assignment cards), wired to
// the real backend (school-eos-backend's parent-homework.controller.ts): list,
// submit (note + real file upload against the private bucket), and open one of
// the parent's own previously-submitted files back via a signed URL. No mock
// data anywhere -- an empty/loading/error state is a real state, never filled in.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { pickDocument, type PickedDocument } from '@/lib/lms-file-picker';
import { getHomeworkFileUrl, listHomework, submitHomework, type ParentHomework } from '@/lib/parent-api';
import { cardShadow, parentColors } from '@/lib/theme';

type StatusFilter = 'ALL' | ParentHomework['submissionStatus'];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'LATE', label: 'Late' },
  { key: 'GRADED', label: 'Graded' },
  { key: 'NOT_DONE', label: 'Not done' },
];

const STATUS_META: Record<ParentHomework['submissionStatus'], { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Pending', bg: parentColors.amberBg, fg: parentColors.amberDark },
  SUBMITTED: { label: 'Submitted', bg: parentColors.greenBg, fg: parentColors.greenDark },
  LATE: { label: 'Late', bg: parentColors.amberBg, fg: parentColors.amberDark },
  GRADED: { label: 'Graded', bg: parentColors.greenBg, fg: parentColors.greenDark },
  NOT_DONE: { label: 'Not done', bg: parentColors.redBg, fg: parentColors.redDark },
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function subjectCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (name.trim().slice(0, 2) || '--').toUpperCase();
}

function fileNameFromKey(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 1] || key;
}

/** submitHomework builds its own fetch call (multipart) and, unlike authedRequest,
 * throws a plain Error whose message is "Submit failed (status): <raw body>" --
 * the raw body is the backend's own JSON envelope, so this recovers its
 * `.message` (e.g. "Homework already graded") instead of showing that raw text. */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) {
    const match = err.message.match(/\):\s*(\{[\s\S]*\})\s*$/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]!) as { message?: string };
        if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
      } catch {
        // raw body wasn't JSON -- fall through to the raw message below
      }
    }
    return err.message || fallback;
  }
  return fallback;
}

function FileIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M14 3v5h5" />
      <Path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={parentColors.muted} strokeWidth={2.4}>
      <Path d="M18 6L6 18" />
      <Path d="M6 6l12 12" />
    </Svg>
  );
}

function StatusPill({ status }: { status: ParentHomework['submissionStatus'] }) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusPillText, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

function SubmissionFileRow({
  studentId,
  homeworkId,
  objectKey,
}: {
  studentId: string;
  homeworkId: string;
  objectKey: string;
}) {
  const [opening, setOpening] = useState(false);

  async function handleOpen() {
    setOpening(true);
    try {
      const url = await getHomeworkFileUrl(studentId, homeworkId, objectKey);
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Could not open file', extractErrorMessage(err, 'Please try again.'));
    } finally {
      setOpening(false);
    }
  }

  return (
    <Pressable style={styles.attachRow} onPress={handleOpen} disabled={opening}>
      <FileIcon color={parentColors.blueDeep} />
      <Text style={styles.attachName} numberOfLines={1}>
        {fileNameFromKey(objectKey)}
      </Text>
      {opening ? <ActivityIndicator size="small" color={parentColors.blueDeep} /> : <Text style={styles.attachOpen}>Open</Text>}
    </Pressable>
  );
}

export default function HomeworkScreen() {
  const router = useRouter();
  const { selected, isLoading: childLoading } = useSelectedChild();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [composerFor, setComposerFor] = useState<ParentHomework | null>(null);
  const [note, setNote] = useState('');
  const [pickedFiles, setPickedFiles] = useState<PickedDocument[]>([]);

  const studentId = selected?.studentId;
  const queryKey = useMemo(() => ['parent-homework', studentId] as const, [studentId]);
  const homeworkQuery = useQuery({
    queryKey,
    queryFn: () => listHomework(studentId!),
    enabled: !!studentId,
  });

  const homework = useMemo(() => homeworkQuery.data ?? [], [homeworkQuery.data]);

  const dueDates = useMemo(() => Array.from(new Set(homework.map((h) => h.dueDate))).sort(), [homework]);

  const stats = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let late = 0;
    for (const h of homework) {
      if (h.submissionStatus === 'PENDING' || h.submissionStatus === 'NOT_DONE') pending += 1;
      if (h.submissionStatus === 'SUBMITTED' || h.submissionStatus === 'GRADED') submitted += 1;
      if (h.submissionStatus === 'LATE') late += 1;
    }
    return { pending, submitted, late };
  }, [homework]);

  const filtered = useMemo(
    () =>
      homework
        .filter((h) => (!selectedDate || h.dueDate === selectedDate) && (statusFilter === 'ALL' || h.submissionStatus === statusFilter))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [homework, selectedDate, statusFilter],
  );

  const submitMutation = useMutation({
    mutationFn: (input: { note?: string; files?: PickedDocument[] }) => submitHomework(studentId!, composerFor!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeComposer();
    },
    onError: (err) => {
      Alert.alert('Could not submit', extractErrorMessage(err, 'Please try again.'));
    },
  });

  function openComposer(h: ParentHomework) {
    setComposerFor(h);
    setNote('');
    setPickedFiles([]);
  }

  function closeComposer() {
    setComposerFor(null);
    setNote('');
    setPickedFiles([]);
  }

  async function handleAttach() {
    const picked = await pickDocument();
    if (!picked) return;
    setPickedFiles((files) => [...files, picked]);
  }

  function removeFile(uri: string) {
    setPickedFiles((files) => files.filter((f) => f.uri !== uri));
  }

  function handleSubmit() {
    submitMutation.mutate({ note: note.trim() || undefined, files: pickedFiles.length ? pickedFiles : undefined });
  }

  if (childLoading || !selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Homework" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Homework" subtitle={selected.studentName} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={homeworkQuery.isFetching} onRefresh={() => homeworkQuery.refetch()} />}
      >
        {homeworkQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : homeworkQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{extractErrorMessage(homeworkQuery.error, 'Unable to load homework.')}</Text>
            <Pressable style={styles.retryButton} onPress={() => homeworkQuery.refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {dueDates.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
                <Pressable style={[styles.dayChip, !selectedDate && styles.dayChipActive]} onPress={() => setSelectedDate(null)}>
                  <Text style={[styles.dayChipLabel, !selectedDate && styles.dayChipLabelActive]}>All</Text>
                </Pressable>
                {dueDates.map((date) => {
                  const d = new Date(date);
                  const active = selectedDate === date;
                  return (
                    <Pressable key={date} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => setSelectedDate(date)}>
                      <Text style={[styles.dayChipDow, active && styles.dayChipLabelActive]}>{WEEKDAY_LABELS[d.getDay()]}</Text>
                      <Text style={[styles.dayChipNum, active && styles.dayChipLabelActive]}>{d.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <View style={[styles.statsCard, cardShadow]}>
              <View>
                <Text style={[styles.statValue, { color: parentColors.bodyMuted }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View>
                <Text style={[styles.statValue, { color: parentColors.blueDeep }]}>{stats.submitted}</Text>
                <Text style={styles.statLabel}>Submitted</Text>
              </View>
              <View>
                <Text style={[styles.statValue, { color: parentColors.ink }]}>{stats.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                return (
                  <Pressable key={f.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setStatusFilter(f.key)}>
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.dayLabel}>{selectedDate ? `DUE ${formatDate(selectedDate).toUpperCase()}` : 'ALL DUE DATES'}</Text>

            {filtered.length === 0 ? (
              <View style={[styles.emptyCard, cardShadow]}>
                <Text style={styles.emptyTitle}>Nothing here</Text>
                <Text style={styles.emptySubtitle}>No homework matches this day and filter.</Text>
              </View>
            ) : (
              filtered.map((h) => {
                const canSubmit = h.submissionStatus !== 'GRADED';
                const objectKeys = h.objectKeys ?? [];
                return (
                  <View key={h.id} style={[styles.card, cardShadow]}>
                    <View style={styles.cardTop}>
                      <View style={styles.subjectAvatar}>
                        <Text style={styles.subjectAvatarText}>{subjectCode(h.subjectName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{h.subjectName}</Text>
                        <Text style={styles.assignedText}>Assigned {formatDate(h.assignedOn)}</Text>
                      </View>
                      <StatusPill status={h.submissionStatus} />
                    </View>

                    <Text style={styles.taskTitle}>{h.title}</Text>
                    {h.description ? <Text style={styles.taskDescription}>{h.description}</Text> : null}

                    {objectKeys.length > 0 ? (
                      <View style={{ gap: 6, marginTop: 11 }}>
                        {objectKeys.map((key) => (
                          <SubmissionFileRow key={key} studentId={studentId!} homeworkId={h.id} objectKey={key} />
                        ))}
                      </View>
                    ) : null}

                    {h.submissionStatus === 'GRADED' ? (
                      <View style={styles.gradedBox}>
                        <Text style={styles.gradedText}>
                          {h.marksAwarded != null ? `Marks ${h.marksAwarded}${h.maxMarks != null ? ` / ${h.maxMarks}` : ''}` : 'Graded'}
                        </Text>
                        {h.feedback ? <Text style={styles.feedbackText}>{h.feedback}</Text> : null}
                      </View>
                    ) : null}

                    <View style={styles.cardFooter}>
                      <Text style={styles.dueText}>Due {formatDate(h.dueDate)}</Text>
                      {canSubmit ? (
                        <Pressable style={styles.submitButton} onPress={() => openComposer(h)}>
                          <Text style={styles.submitButtonText}>
                            {h.submissionStatus === 'SUBMITTED' || h.submissionStatus === 'LATE' ? 'Update submission' : 'Mark completed'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!composerFor} animationType="slide" transparent onRequestClose={closeComposer}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle} numberOfLines={2}>
                    {composerFor?.title}
                  </Text>
                  <Text style={styles.sheetSubtitle}>{composerFor?.subjectName}</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={closeComposer}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note for your teacher"
                placeholderTextColor={parentColors.muted}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textarea]}
              />

              <Text style={styles.fieldLabel}>ATTACHMENT (OPTIONAL)</Text>
              <Pressable style={styles.attachButton} onPress={handleAttach}>
                <Text style={styles.attachButtonText}>Attach a file</Text>
              </Pressable>
              {pickedFiles.map((f) => (
                <View key={f.uri} style={styles.pickedChip}>
                  <FileIcon color={parentColors.blueDeep} />
                  <Text style={styles.pickedChipName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => removeFile(f.uri)}>
                    <CloseIcon />
                  </Pressable>
                </View>
              ))}

              <Pressable
                style={[styles.confirmButton, submitMutation.isPending && styles.confirmButtonDisabled]}
                disabled={submitMutation.isPending}
                onPress={handleSubmit}
              >
                {submitMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Submit</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  errorText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.redDark, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },

  dayRow: { gap: 6, paddingBottom: 2 },
  dayChip: {
    width: 46,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: parentColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  dayChipLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  dayChipLabelActive: { color: '#fff' },
  dayChipDow: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, textTransform: 'uppercase' },
  dayChipNum: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 1 },

  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statValue: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  statLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, marginTop: 2 },

  filterRow: { gap: 8, paddingBottom: 2 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: parentColors.pillNeutralBg },
  filterChipActive: { backgroundColor: parentColors.blue },
  filterChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  filterChipTextActive: { color: '#fff' },

  dayLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1, color: parentColors.muted, textTransform: 'uppercase', marginLeft: 2 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 28, alignItems: 'center' },
  emptyTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  emptySubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 5 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectAvatar: { width: 40, height: 40, borderRadius: 11, backgroundColor: parentColors.dueBg, alignItems: 'center', justifyContent: 'center' },
  subjectAvatarText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  subjectName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  assignedText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  statusPill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99 },
  statusPillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },

  taskTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, marginTop: 11 },
  taskDescription: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.bodyMuted, marginTop: 4, lineHeight: 19 },

  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: parentColors.background, borderRadius: 10, padding: 11 },
  attachName: { flex: 1, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  attachOpen: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted },

  gradedBox: { marginTop: 11, backgroundColor: parentColors.greenBg, borderRadius: 10, padding: 11 },
  gradedText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.greenDark },
  feedbackText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.greenDark, marginTop: 3 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  dueText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  submitButton: { backgroundColor: parentColors.blue, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10 },
  submitButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,27,51,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  sheetSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: parentColors.pillNeutralBg, alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: parentColors.fieldBorder, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: parentColors.ink, fontFamily: 'PlusJakartaSans_500Medium' },
  textarea: { height: 78, textAlignVertical: 'top' },

  attachButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  attachButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  pickedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: parentColors.background,
    borderRadius: 10,
    padding: 11,
    marginTop: 8,
  },
  pickedChipName: { flex: 1, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },

  confirmButton: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: parentColors.blue },
  confirmButtonDisabled: { backgroundColor: parentColors.disabled },
  confirmButtonText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
