// Parent Meetings -- real scheduling + booking, now fully wired (was a
// frontend-only shell). Faculty creates bookable slots (date + from/to
// time); parents of students this faculty teaches or advises can book one
// (their own app, out of scope here); faculty approves/rejects the request
// here. Full CRUD on slots.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { StatCards } from '@/components/faculty/StatCards';
import { PlusIcon, TrashIcon, EditIcon, CloseIcon } from '@/components/faculty/icons';
import {
  listMeetingSlots,
  createMeetingSlot,
  updateMeetingSlot,
  deleteMeetingSlot,
  decideMeetingBooking,
  type MeetingSlot,
} from '@/lib/faculty-parent-meetings-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

export default function ParentMeetingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingSlot | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ['faculty-parent-meetings'], queryFn: listMeetingSlots });
  const slots = listQuery.data ?? [];
  const booked = slots.filter((s) => s.booking).length;
  const pending = slots.filter((s) => s.booking?.state === 'PENDING').length;

  function openComposer(slot?: MeetingSlot) {
    if (slot) {
      setEditing(slot);
      setMeetingDate(slot.meetingDate.slice(0, 10));
      setFromTime(slot.fromTime.slice(0, 5));
      setToTime(slot.toTime.slice(0, 5));
    } else {
      setEditing(null);
      setMeetingDate('');
      setFromTime('');
      setToTime('');
    }
    setComposerOpen(true);
  }

  const canSave = meetingDate.trim().length > 0 && fromTime.trim().length > 0 && toTime.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) await updateMeetingSlot(editing.id, { meetingDate, fromTime, toTime });
      else await createMeetingSlot({ meetingDate, fromTime, toTime });
      queryClient.invalidateQueries({ queryKey: ['faculty-parent-meetings'] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not save slot', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(slot: MeetingSlot) {
    Alert.alert('Delete this slot?', `${formatDate(slot.meetingDate)} · ${slot.fromTime.slice(0, 5)}–${slot.toTime.slice(0, 5)} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeetingSlot(slot.id);
            queryClient.invalidateQueries({ queryKey: ['faculty-parent-meetings'] });
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  async function decide(bookingId: string, decision: 'APPROVED' | 'REJECTED') {
    setDecidingId(bookingId);
    try {
      await decideMeetingBooking(bookingId, decision);
      queryClient.invalidateQueries({ queryKey: ['faculty-parent-meetings'] });
    } catch (err) {
      Alert.alert('Could not update booking', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Parent Meetings" subtitle="Your bookable slots" onBack={() => router.replace('/erp' as never)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}>
        <StatCards items={[{ label: 'SLOTS', value: String(slots.length) }, { label: 'BOOKED', value: String(booked) }, { label: 'PENDING', value: String(pending) }]} />

        <Pressable style={styles.addButton} onPress={() => openComposer()}>
          <PlusIcon />
          <Text style={styles.addButtonText}>Add a slot</Text>
        </Pressable>

        {listQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : slots.length === 0 ? (
          <Text style={styles.emptyText}>No slots yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} onEdit={() => openComposer(slot)} onDelete={() => confirmDelete(slot)} onDecide={decide} deciding={decidingId} />
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
                  <Text style={styles.sheetTitle}>{editing ? 'Edit slot' : 'New slot'}</Text>
                  <Text style={styles.sheetSubtitle}>Parents of your students can book this</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>DATE</Text>
              <TextInput value={meetingDate} onChangeText={setMeetingDate} placeholder="YYYY-MM-DD" style={styles.input} />

              <Text style={styles.fieldLabel}>FROM TIME</Text>
              <TextInput value={fromTime} onChangeText={setFromTime} placeholder="HH:MM (24-hour)" style={styles.input} />

              <Text style={styles.fieldLabel}>TO TIME</Text>
              <TextInput value={toTime} onChangeText={setToTime} placeholder="HH:MM (24-hour)" style={styles.input} />

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editing ? 'Save changes' : 'Create slot'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SlotCard({
  slot,
  onEdit,
  onDelete,
  onDecide,
  deciding,
}: {
  slot: MeetingSlot;
  onEdit: () => void;
  onDelete: () => void;
  onDecide: (bookingId: string, decision: 'APPROVED' | 'REJECTED') => void;
  deciding: string | null;
}) {
  const booking = slot.booking;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle}>{formatDate(slot.meetingDate)}</Text>
          <Text style={styles.cardMeta}>{slot.fromTime.slice(0, 5)} – {slot.toTime.slice(0, 5)}</Text>
        </View>
        {!booking ? (
          <View style={styles.cardActions}>
            <Pressable hitSlop={8} onPress={onEdit}><EditIcon /></Pressable>
            <Pressable hitSlop={8} onPress={onDelete}><TrashIcon /></Pressable>
          </View>
        ) : (
          <View style={[styles.stateBadge, booking.state === 'APPROVED' && { backgroundColor: facultyColors.greenBg }]}>
            <Text style={[styles.stateBadgeText, booking.state === 'APPROVED' && { color: facultyColors.greenDark }]}>{booking.state}</Text>
          </View>
        )}
      </View>

      {booking ? (
        <View style={styles.bookingBox}>
          <Text style={styles.bookingName}>{booking.studentName} · {booking.gradeName} {booking.sectionName}</Text>
          <Text style={styles.bookingParent}>Parent: {booking.parentName}{booking.parentPhone ? ` · ${booking.parentPhone}` : ''}</Text>
          {booking.notes ? <Text style={styles.bookingNotes}>{booking.notes}</Text> : null}
          {booking.state === 'PENDING' ? (
            <View style={styles.decideRow}>
              <Pressable style={[styles.decideBtn, styles.approveBtn]} disabled={deciding === booking.id} onPress={() => onDecide(booking.id, 'APPROVED')}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </Pressable>
              <Pressable style={[styles.decideBtn, styles.rejectBtn]} disabled={deciding === booking.id} onPress={() => onDecide(booking.id, 'REJECTED')}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.openLabel}>Open · no booking yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  addButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16 },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 15 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 14 },
  stateBadge: { backgroundColor: facultyColors.amberBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  stateBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.amberDark },
  openLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 10 },
  bookingBox: { marginTop: 11, borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, paddingTop: 11 },
  bookingName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  bookingParent: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.mutedStrong, marginTop: 3 },
  bookingNotes: { fontSize: 12.5, color: facultyColors.body, marginTop: 6, fontFamily: 'PlusJakartaSans_500Medium' },
  decideRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  decideBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  approveBtn: { backgroundColor: facultyColors.blue },
  approveBtnText: { color: '#fff', fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold' },
  rejectBtn: { borderWidth: 1, borderColor: facultyColors.borderLight },
  rejectBtnText: { color: facultyColors.bodyMuted, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
