// Marks Entry -- teaching-offering scoped. Pixel-matches the design's
// subject·class switcher + exam-tab row + per-student input list, with two
// real additions the static mock never needed: an Absent toggle (the backend
// genuinely rejects marks+absent together) and TWO actions -- "Save draft"
// and "Save & publish" -- instead of the mock's single generic "Save"
// (matches the user's own explicit ask). Editing is only possible while the
// exam is in its real MARKS_ENTRY state; otherwise this is a read-only
// published/locked view with a clear status line, matching the backend's own
// 409 guard rather than silently failing on submit.

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { listTeachingOfferings } from '@/lib/faculty-scope-api';
import { listExamsForOffering, getMarksRoster, saveMarks, publishMarks } from '@/lib/faculty-marks-api';
import { initialsOf } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

interface Draft {
  value: string;
  isAbsent: boolean;
}

export default function MarksEntryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [offeringOverride, setOfferingOverride] = useState<string | null>(null);
  // Keyed to the offering it was picked under -- an offering change
  // naturally "resets" the exam pick back to the list's own first real exam,
  // with no separate reset-effect needed.
  const [examOverride, setExamOverride] = useState<{ offeringKey: string; examSubjectId: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  const offeringsQuery = useQuery({ queryKey: ['faculty-teaching-offerings'], queryFn: listTeachingOfferings });
  const offeringKey = offeringOverride ?? offeringsQuery.data?.[0]?.subjectOfferingId ?? null;

  const offeringOptions = useMemo(
    () => (offeringsQuery.data ?? []).map((o) => ({ key: o.subjectOfferingId, label: `${o.subjectName} · ${o.gradeName} ${o.sectionName}` })),
    [offeringsQuery.data],
  );

  const examsQuery = useQuery({
    queryKey: ['faculty-marks-exams', offeringKey],
    queryFn: () => listExamsForOffering(offeringKey!),
    enabled: !!offeringKey,
  });
  const examSubjectId =
    (examOverride?.offeringKey === offeringKey ? examOverride.examSubjectId : null) ?? examsQuery.data?.[0]?.examSubjectId ?? null;

  const rosterQuery = useQuery({
    queryKey: ['faculty-marks-roster', examSubjectId],
    queryFn: () => getMarksRoster(examSubjectId!),
    enabled: !!examSubjectId,
  });

  // Genuinely different from the "pick a sensible default" cases above --
  // this seeds LOCAL, user-editable state from a fetch the moment it lands,
  // not a value re-derivable from the query result on every render (the user
  // goes on to freely edit `drafts` afterward). There's no render-time
  // equivalent for "initialize once, then diverge."
  useEffect(() => {
    if (!rosterQuery.data) return;
    const next: Record<string, Draft> = {};
    for (const r of rosterQuery.data.roster) {
      next[r.studentId] = { value: r.marksObtained !== null ? String(r.marksObtained) : '', isAbsent: r.isAbsent };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(next);
  }, [rosterQuery.data]);

  const exam = rosterQuery.data?.examSubject;
  const canEdit = exam?.examState === 'MARKS_ENTRY';

  function toggleAbsent(studentId: string) {
    setDrafts((d) => ({ ...d, [studentId]: { value: d[studentId]?.isAbsent ? d[studentId]!.value : '', isAbsent: !d[studentId]?.isAbsent } }));
  }
  function setValue(studentId: string, value: string) {
    setDrafts((d) => ({ ...d, [studentId]: { value, isAbsent: false } }));
  }

  function buildEntries() {
    return Object.entries(drafts).map(([studentId, d]) => ({
      studentId,
      isAbsent: d.isAbsent,
      marksObtained: d.isAbsent ? undefined : d.value.trim() === '' ? undefined : Number(d.value),
    }));
  }

  async function handleSave(publish: boolean) {
    if (!examSubjectId) return;
    setSaving(publish ? 'publish' : 'draft');
    try {
      await saveMarks(examSubjectId, buildEntries());
      if (publish) await publishMarks(examSubjectId);
      queryClient.invalidateQueries({ queryKey: ['faculty-marks-roster', examSubjectId] });
      queryClient.invalidateQueries({ queryKey: ['faculty-marks-exams', offeringKey] });
      Alert.alert(publish ? 'Marks published' : 'Draft saved', publish ? 'Students and parents can now see these marks.' : 'You can continue editing before publishing.');
    } catch (err) {
      Alert.alert('Could not save marks', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Marks Entry" subtitle={offeringOptions.find((o) => o.key === offeringKey)?.label ?? ''} onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={rosterQuery.isFetching} onRefresh={() => rosterQuery.refetch()} />}
      >
        {offeringsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : offeringOptions.length === 0 ? (
          <Text style={styles.emptyText}>You do not teach any subject offerings.</Text>
        ) : (
          <>
            <ClassSwitcher label="SUBJECT · CLASS" options={offeringOptions} selectedKey={offeringKey} onSelect={setOfferingOverride} />

            {examsQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
            ) : (examsQuery.data ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No exams scheduled for this class yet.</Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examTabRow}>
                  {(examsQuery.data ?? []).map((ex) => {
                    const active = ex.examSubjectId === examSubjectId;
                    return (
                      <Pressable key={ex.examSubjectId} style={[styles.examTab, active && styles.examTabActive]} onPress={() => offeringKey && setExamOverride({ offeringKey, examSubjectId: ex.examSubjectId })}>
                        <Text style={[styles.examTabText, active && styles.examTabTextActive]} numberOfLines={1}>{ex.examName}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {rosterQuery.isLoading ? (
                  <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
                ) : rosterQuery.data ? (
                  <>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryLabel}>ENTRY</Text>
                      <Text style={styles.examMax}>Max {exam?.maxMarks}</Text>
                    </View>

                    {!canEdit ? (
                      <View style={styles.stateNotice}>
                        <Text style={styles.stateNoticeText}>
                          {exam?.examState === 'PUBLISHED' || exam?.examState === 'VERIFIED' || exam?.examState === 'LOCKED'
                            ? 'This exam has already been published -- read-only.'
                            : `Marks entry opens once this exam is in progress (current status: ${exam?.examState}).`}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ gap: 8 }}>
                      {rosterQuery.data.roster.map((r) => {
                        const draft = drafts[r.studentId] ?? { value: '', isAbsent: false };
                        return (
                          <View key={r.studentId} style={styles.entryRow}>
                            <View style={styles.entryAvatar}>
                              <Text style={styles.entryInitials}>{initialsOf(r.studentName.split(' ')[0] ?? '', r.studentName.split(' ').slice(1).join(' '))}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.entryName} numberOfLines={1}>{r.studentName}</Text>
                              <Text style={styles.entryRoll}>Roll {r.rollNo ?? '—'}</Text>
                            </View>
                            <Pressable
                              style={[styles.absentChip, draft.isAbsent && styles.absentChipActive]}
                              onPress={() => canEdit && toggleAbsent(r.studentId)}
                              disabled={!canEdit}
                            >
                              <Text style={[styles.absentChipText, draft.isAbsent && { color: '#fff' }]}>Absent</Text>
                            </Pressable>
                            <TextInput
                              value={draft.value}
                              onChangeText={(v) => setValue(r.studentId, v.replace(/[^0-9.]/g, ''))}
                              editable={canEdit && !draft.isAbsent}
                              keyboardType="decimal-pad"
                              placeholder="—"
                              style={[styles.marksInput, (!canEdit || draft.isAbsent) && styles.marksInputDisabled]}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
      {canEdit ? (
        <View style={styles.footerBar}>
          <Pressable style={[styles.footerBtn, styles.draftBtn]} disabled={!!saving} onPress={() => handleSave(false)}>
            {saving === 'draft' ? <ActivityIndicator color={facultyColors.blue} size="small" /> : <Text style={styles.draftBtnText}>Save draft</Text>}
          </Pressable>
          <Pressable style={[styles.footerBtn, styles.publishBtn]} disabled={!!saving} onPress={() => handleSave(true)}>
            {saving === 'publish' ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.publishBtnText}>Save & publish</Text>}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 40, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  examTabRow: { flexDirection: 'row', gap: 6, backgroundColor: facultyColors.chipTrack, borderRadius: 12, padding: 4 },
  examTab: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9 },
  examTabActive: { backgroundColor: facultyColors.blue },
  examTabText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  examTabTextActive: { color: '#fff' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginHorizontal: 4 },
  entryLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2 },
  examMax: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#C0C8D6' },
  stateNotice: { backgroundColor: facultyColors.amberBg, borderRadius: 12, padding: 12 },
  stateNoticeText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.amberDark },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 11 },
  entryAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: facultyColors.blueLight, alignItems: 'center', justifyContent: 'center' },
  entryInitials: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  entryName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  entryRoll: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  absentChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: facultyColors.borderLight },
  absentChipActive: { backgroundColor: facultyColors.red, borderColor: facultyColors.red },
  absentChipText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.mutedStrong },
  marksInput: { width: 56, textAlign: 'center', borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 6, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  marksInputDisabled: { backgroundColor: facultyColors.rowBg, color: facultyColors.muted },
  footerBar: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: facultyColors.background, borderTopWidth: 1, borderTopColor: facultyColors.borderSoft },
  footerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14 },
  draftBtn: { borderWidth: 1, borderColor: facultyColors.borderLight, backgroundColor: '#fff' },
  draftBtnText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blue },
  publishBtn: { backgroundColor: facultyColors.blue },
  publishBtnText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
});
