// Faculty's own event detail -- full event info, the real participant list
// (Waiting for approval / Approved / Rejected per student, see
// StudentEventParticipantRepository), remove-a-student CRUD, "download letter"
// once a participant is APPROVED (same PermissionLetterPayload + expo-print
// template the Parent side uses), and delete-the-whole-event CRUD.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { formatDate, formatTime } from '@/lib/format';
import {
  deleteEvent,
  getEvent,
  getPermissionLetter,
  removeStudentFromEvent,
  type EventParticipant,
  type ParticipantState,
} from '@/lib/faculty-events-api';
import { printPermissionLetter } from '@/lib/permission-letter-print';
import { parentColors, cardShadow } from '@/lib/theme';

const STATE_LABEL: Record<ParticipantState, string> = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const STATE_COLOR: Record<ParticipantState, { bg: string; text: string }> = {
  PENDING: { bg: parentColors.pillNeutralBg, text: parentColors.ink },
  APPROVED: { bg: '#E7F6EC', text: '#1E7A3E' },
  REJECTED: { bg: '#FDECEA', text: '#B33A2E' },
};

function TrashIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#B33A2E" strokeWidth={1.9}>
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </Svg>
  );
}

function StatePill({ state }: { state: ParticipantState }) {
  const { bg, text } = STATE_COLOR[state];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: text }]}>{STATE_LABEL[state]}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busyParticipantId, setBusyParticipantId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  const eventQuery = useQuery({ queryKey: ['faculty-event', id], queryFn: () => getEvent(id!), enabled: !!id });

  async function handleDownloadLetter(participant: EventParticipant) {
    setBusyParticipantId(participant.id);
    try {
      const letter = await getPermissionLetter(id!, participant.id);
      await printPermissionLetter(letter);
    } catch (err) {
      Alert.alert('Could not open letter', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyParticipantId(null);
    }
  }

  function confirmRemove(participant: EventParticipant) {
    Alert.alert('Remove student?', `${participant.studentName} will be removed from this event.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusyParticipantId(participant.id);
          try {
            await removeStudentFromEvent(id!, participant.id);
            queryClient.invalidateQueries({ queryKey: ['faculty-event', id] });
          } catch (err) {
            Alert.alert('Could not remove student', err instanceof Error ? err.message : 'Please try again.');
          } finally {
            setBusyParticipantId(null);
          }
        },
      },
    ]);
  }

  function confirmDeleteEvent() {
    Alert.alert('Delete this event?', 'Every student’s permission request on it will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingEvent(true);
          try {
            await deleteEvent(id!);
            queryClient.invalidateQueries({ queryKey: ['faculty-events'] });
            router.replace('/events');
          } catch (err) {
            Alert.alert('Could not delete event', err instanceof Error ? err.message : 'Please try again.');
            setDeletingEvent(false);
          }
        },
      },
    ]);
  }

  const event = eventQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title={event?.name ?? 'Event'} subtitle={event ? formatDate(event.startsAt) : undefined} onBack={() => router.replace('/events')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={eventQuery.isFetching} onRefresh={() => eventQuery.refetch()} />}
      >
        {eventQuery.isLoading || !event ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.rowLabel}>Location</Text>
              <Text style={styles.rowValue}>{event.location}</Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>When</Text>
              <Text style={styles.rowValue}>
                {formatDate(event.startsAt)} · {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
              </Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Purpose</Text>
              <Text style={styles.rowValue}>{event.purpose}</Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Monitoring teacher</Text>
              <Text style={styles.rowValue}>
                {event.monitoringTeacherName}
                {event.monitoringTeacherDesignation ? ` · ${event.monitoringTeacherDesignation}` : ''}
              </Text>

              <Pressable style={styles.deleteEventButton} onPress={confirmDeleteEvent} disabled={deletingEvent}>
                {deletingEvent ? <ActivityIndicator color="#B33A2E" /> : <><TrashIcon /><Text style={styles.deleteEventText}>Delete event</Text></>}
              </Pressable>
            </View>

            <Pressable style={styles.addButton} onPress={() => router.push(`/events/${id}/add-students`)}>
              <Text style={styles.addButtonText}>+ Add students</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>STUDENTS ({event.participants.length})</Text>
            {event.participants.length === 0 ? (
              <Text style={styles.emptyText}>No students added yet.</Text>
            ) : (
              event.participants.map((p) => (
                <View key={p.id} style={[styles.card, cardShadow, styles.participantCard]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.participantName} numberOfLines={1}>{p.studentName}</Text>
                    <Text style={styles.participantMeta} numberOfLines={1}>
                      Roll {p.rollNo ?? '—'} · {[p.gradeName, p.sectionName].filter(Boolean).join(' ') || 'Class not assigned'}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      <StatePill state={p.state} />
                    </View>
                    {p.state === 'APPROVED' ? (
                      <Pressable
                        style={styles.letterButton}
                        onPress={() => handleDownloadLetter(p)}
                        disabled={busyParticipantId === p.id}
                      >
                        <Text style={styles.letterButtonText}>{busyParticipantId === p.id ? 'Preparing…' : 'Download permission letter'}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Pressable onPress={() => confirmRemove(p)} disabled={busyParticipantId === p.id} style={styles.removeButton} hitSlop={8}>
                    <TrashIcon />
                  </Pressable>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  rowLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.mutedLight, letterSpacing: 0.5, textTransform: 'uppercase' },
  rowValue: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, marginTop: 3 },
  deleteEventButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, alignSelf: 'flex-start' },
  deleteEventText: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5 },
  addButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
  sectionTitle: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, letterSpacing: 1, marginTop: 6 },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 12 },
  participantCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  participantName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  participantMeta: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  pill: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 99 },
  pillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
  letterButton: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DCE7FB', backgroundColor: '#F5F8FE' },
  letterButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  removeButton: { padding: 6 },
});
