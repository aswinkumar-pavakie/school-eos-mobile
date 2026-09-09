// Meetings -- real faculty/parent-meetings scheduling, Parent side. Lists the
// real bookable slots for this student's own faculty (each already carrying
// only this student's own booking, if any), lets the parent request an open
// one with an optional note. No fabricated fixed "Parent-Teacher Meeting" day
// anywhere -- the banner shows a real, honest count of open slots instead.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { ApiError } from '@/lib/api';
import { createParentMeetingBooking, listParentMeetingSlots, type MeetingSlot } from '@/lib/faculty-parent-meetings-api';
import { formatDate } from '@/lib/format';
import { cardShadow, parentColors } from '@/lib/theme';

type ParentSlot = MeetingSlot & { facultyName: string };

function slotStateMeta(slot: ParentSlot): { bg: string; border: string; fg: string; sub: string; label: string; open: boolean } {
  if (slot.booking?.state === 'APPROVED') {
    return { bg: parentColors.greenBg, border: parentColors.greenBg, fg: parentColors.greenDark, sub: parentColors.greenDark, label: 'Confirmed', open: false };
  }
  if (slot.booking) {
    return { bg: parentColors.amberBg, border: parentColors.amberBg, fg: parentColors.ink, sub: parentColors.amberDark, label: 'Requested', open: false };
  }
  return { bg: parentColors.white, border: parentColors.border, fg: parentColors.ink, sub: parentColors.blueDeep, label: 'Available', open: true };
}

export default function MeetingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selected, isLoading: childLoading } = useSelectedChild();

  const [composerSlot, setComposerSlot] = useState<ParentSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const studentId = selected?.studentId;
  const queryKey = ['parent-meeting-slots', studentId];
  const listQuery = useQuery({
    queryKey,
    queryFn: () => listParentMeetingSlots(studentId as string),
    enabled: !!studentId,
  });

  const slots = useMemo(() => {
    const rows = listQuery.data ?? [];
    return [...rows].sort((a, b) => {
      const dateDiff = a.meetingDate.localeCompare(b.meetingDate);
      return dateDiff !== 0 ? dateDiff : a.fromTime.localeCompare(b.fromTime);
    });
  }, [listQuery.data]);
  const openCount = slots.filter((s) => !s.booking).length;

  function openComposer(slot: ParentSlot) {
    setNotes('');
    setComposerSlot(slot);
  }

  function closeComposer() {
    setComposerSlot(null);
    setNotes('');
  }

  async function submitBooking() {
    if (!studentId || !composerSlot) return;
    setSubmitting(true);
    try {
      await createParentMeetingBooking({ slotId: composerSlot.id, studentId, notes: notes.trim() || undefined });
      queryClient.invalidateQueries({ queryKey });
      closeComposer();
    } catch (err) {
      Alert.alert('Could not request this slot', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Meetings" subtitle="Book time with your child's teachers" onBack={() => router.back()} />

      {childLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      ) : !studentId ? (
        <View style={styles.loading}>
          <Text style={styles.emptyText}>No child linked to your account.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
        >
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Book a meeting with your child&apos;s teachers</Text>
            <Text style={styles.bannerMeta}>{openCount} slot{openCount === 1 ? '' : 's'} available</Text>
          </View>

          <Text style={styles.sectionLabel}>Choose a slot</Text>

          {listQuery.isLoading ? (
            <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
          ) : listQuery.isError ? (
            <ErrorState
              message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load meeting slots.'}
              onRetry={() => listQuery.refetch()}
            />
          ) : slots.length === 0 ? (
            <Text style={styles.emptyText}>No meeting slots yet.</Text>
          ) : (
            slots.map((slot) => {
              const meta = slotStateMeta(slot);
              return (
                <Pressable
                  key={slot.id}
                  disabled={!meta.open}
                  onPress={() => openComposer(slot)}
                  style={[styles.slotCard, { backgroundColor: meta.bg, borderColor: meta.border }, !meta.open && cardShadow]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.slotTime, { color: meta.fg }]}>
                      {formatDate(slot.meetingDate)} · {slot.fromTime.slice(0, 5)}–{slot.toTime.slice(0, 5)}
                    </Text>
                    <Text style={styles.slotFaculty} numberOfLines={1}>
                      {slot.facultyName}
                    </Text>
                  </View>
                  <Text style={[styles.slotState, { color: meta.sub }]}>{meta.label}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={composerSlot !== null} animationType="slide" transparent onRequestClose={closeComposer}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            {composerSlot ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>Request this slot</Text>
                <Text style={styles.sheetSubtitle}>
                  {formatDate(composerSlot.meetingDate)} · {composerSlot.fromTime.slice(0, 5)}–{composerSlot.toTime.slice(0, 5)} with {composerSlot.facultyName}
                </Text>
                <Text style={styles.fieldLabel}>NOTES (OPTIONAL)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything you'd like the teacher to know"
                  placeholderTextColor={parentColors.mutedLight}
                  style={styles.notesInput}
                  multiline
                />
                <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} disabled={submitting} onPress={submitBooking}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Request</Text>}
                </Pressable>
                <Pressable style={styles.cancelButton} onPress={closeComposer}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 8 },
  banner: { backgroundColor: parentColors.pillBlueBg, borderRadius: 16, padding: 16, paddingVertical: 18 },
  bannerTitle: { fontSize: 16.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  bannerMeta: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.blueDeep, marginTop: 6 },
  sectionLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  slotCard: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  slotTime: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  slotFaculty: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  slotState: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: parentColors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  sheetSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedSoft, marginTop: 4, marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, letterSpacing: 1, marginBottom: 7 },
  notesInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: parentColors.ink,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitButton: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: parentColors.blue },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  cancelButton: { marginTop: 10, alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.mutedSoft },
});
