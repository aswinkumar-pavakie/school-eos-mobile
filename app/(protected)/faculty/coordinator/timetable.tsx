// Academic Coordinator -- Class Timetable editor. Pick a section, pick a
// day, tap a free period to fill it (draft, invisible to the real teacher
// until Publish), tap a draft period to remove it. The DB's own real
// teacher-clash trigger is what actually blocks a double-booked teacher --
// this screen just surfaces that as a friendly alert.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { CloseIcon, TrashIcon } from '@/components/faculty/icons';
import {
  getCoordinatorStructure,
  getCoordinatorTimetable,
  getCoordinatorOfferings,
  upsertTimetableSlot,
  deleteTimetableSlot,
  publishTimetable,
  type CoordinatorTimetableSlot,
} from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

const DAY_SHORT: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

export default function CoordinatorTimetableScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sectionOverride, setSectionOverride] = useState<string | null>(null);
  const [day, setDay] = useState(1);
  const [pickerPeriodId, setPickerPeriodId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const structureQuery = useQuery({ queryKey: ['coordinator-structure'], queryFn: getCoordinatorStructure });
  const sections = structureQuery.data?.sections ?? [];
  const sectionId = sectionOverride ?? sections[0]?.sectionId ?? null;
  const options = sections.map((s) => ({ key: s.sectionId, label: `${s.gradeName} ${s.sectionName}` }));

  const timetableQuery = useQuery({
    queryKey: ['coordinator-timetable', sectionId],
    queryFn: () => getCoordinatorTimetable(sectionId!),
    enabled: !!sectionId,
  });
  const offeringsQuery = useQuery({
    queryKey: ['coordinator-offerings-for-section', sectionId],
    queryFn: () => getCoordinatorOfferings({ sectionId: sectionId! }),
    enabled: !!sectionId && !!pickerPeriodId,
  });

  const daySlots = useMemo(() => {
    const map = new Map<string, CoordinatorTimetableSlot>();
    for (const s of timetableQuery.data?.slots ?? []) if (s.dayOfWeek === day) map.set(s.periodId, s);
    return map;
  }, [timetableQuery.data, day]);

  const draftCount = (timetableQuery.data?.slots ?? []).filter((s) => s.isDraft).length;

  async function handlePick(subjectOfferingId: string) {
    if (!sectionId || !pickerPeriodId) return;
    try {
      await upsertTimetableSlot({ sectionId, dayOfWeek: day, periodId: pickerPeriodId, subjectOfferingId });
      queryClient.invalidateQueries({ queryKey: ['coordinator-timetable', sectionId] });
      setPickerPeriodId(null);
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  function confirmDelete(slot: CoordinatorTimetableSlot) {
    Alert.alert('Remove this draft slot?', `${slot.subjectName} will be removed from this day and period.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTimetableSlot(slot.slotId);
            queryClient.invalidateQueries({ queryKey: ['coordinator-timetable', sectionId] });
          } catch (err) {
            Alert.alert('Could not remove', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  async function handlePublish() {
    if (!sectionId) return;
    setPublishing(true);
    try {
      const res = await publishTimetable(sectionId);
      queryClient.invalidateQueries({ queryKey: ['coordinator-timetable', sectionId] });
      Alert.alert('Published', `${res.publishedSlotCount} slot${res.publishedSlotCount === 1 ? '' : 's'} are now live for this class's teachers.`);
    } catch (err) {
      Alert.alert('Could not publish', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Class Timetable" subtitle="Draft, then publish" onBack={() => router.replace('/faculty/coordinator' as never)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={timetableQuery.isFetching} onRefresh={() => timetableQuery.refetch()} />}>
        {structureQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            <ClassSwitcher label="SECTION" options={options} selectedKey={sectionId} onSelect={setSectionOverride} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {[1, 2, 3, 4, 5, 6].map((d) => {
                const active = d === day;
                return (
                  <Pressable key={d} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => setDay(d)}>
                    <Text style={[styles.dayChipText, active && { color: '#fff' }]}>{DAY_SHORT[d]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {draftCount > 0 ? (
              <Pressable style={styles.publishButton} onPress={handlePublish} disabled={publishing}>
                {publishing ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.publishButtonText}>Publish {draftCount} draft slot{draftCount === 1 ? '' : 's'}</Text>
                )}
              </Pressable>
            ) : null}

            {timetableQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
            ) : (
              <View style={{ gap: 8 }}>
                {(timetableQuery.data?.periods ?? []).map((p) => {
                  const slot = daySlots.get(p.periodId);
                  return (
                    <Pressable
                      key={p.periodId}
                      style={[styles.periodRow, p.isBreak && styles.periodRowBreak]}
                      disabled={p.isBreak}
                      onPress={() => (slot ? (slot.isDraft ? confirmDelete(slot) : null) : setPickerPeriodId(p.periodId))}
                    >
                      <View style={styles.periodTimeCol}>
                        <Text style={styles.periodTime}>{p.startTime.slice(0, 5)}</Text>
                        <Text style={styles.periodTimeMuted}>{p.endTime.slice(0, 5)}</Text>
                      </View>
                      <View style={styles.periodDivider} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {p.isBreak ? (
                          <Text style={styles.breakLabel}>{p.label ?? 'Break'}</Text>
                        ) : slot ? (
                          <>
                            <Text style={styles.slotSubject}>{slot.subjectName}{slot.isDraft ? ' (draft)' : ''}</Text>
                            <Text style={styles.slotMeta}>{slot.teacherName ?? 'Unassigned teacher'}{slot.room ? ` · ${slot.room}` : ''}</Text>
                          </>
                        ) : (
                          <Text style={styles.freeLabel}>Tap to fill · {p.label ?? `Period ${p.periodNo}`}</Text>
                        )}
                      </View>
                      {slot?.isDraft ? <TrashIcon /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!pickerPeriodId} animationType="slide" transparent onRequestClose={() => setPickerPeriodId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Pick a subject</Text>
                <Text style={styles.sheetSubtitle}>Only this section&apos;s own subjects can be scheduled here</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setPickerPeriodId(null)}>
                <CloseIcon />
              </Pressable>
            </View>
            {offeringsQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {(offeringsQuery.data ?? []).map((o) => (
                  <Pressable key={o.subjectOfferingId} style={styles.facultyRow} onPress={() => handlePick(o.subjectOfferingId)}>
                    <Text style={styles.facultyName}>{o.subjectName}</Text>
                    <Text style={styles.facultyDesignation}>{o.teacherName ?? 'Unassigned teacher'}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  dayRow: { flexDirection: 'row', gap: 8 },
  dayChip: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight },
  dayChipActive: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  dayChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  publishButton: { backgroundColor: facultyColors.green, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  publishButtonText: { color: '#fff', fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold' },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  periodRowBreak: { backgroundColor: facultyColors.rowBg },
  periodTimeCol: { width: 52, alignItems: 'flex-start' },
  periodTime: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  periodTimeMuted: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  periodDivider: { width: 1, alignSelf: 'stretch', backgroundColor: facultyColors.borderSoft },
  breakLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.mutedStrong, fontStyle: 'italic' },
  slotSubject: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  slotMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  freeLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '80%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  facultyRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: facultyColors.borderSoft },
  facultyName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  facultyDesignation: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
});
