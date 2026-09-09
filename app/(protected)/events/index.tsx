// Faculty's own Events list -- real events this faculty member created (see
// StudentEventsService.getOwned's own-events-only boundary), shown as cards.
// Real backend data only; an empty list is a real "nothing yet", never a filled
// placeholder.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { formatDate, formatTime } from '@/lib/format';
import { deleteEvent, listEvents, type StudentEvent } from '@/lib/faculty-events-api';
import { parentColors, cardShadow } from '@/lib/theme';

function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#B33A2E" strokeWidth={1.9}>
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </Svg>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const eventsQuery = useQuery({ queryKey: ['faculty-events'], queryFn: listEvents });

  function confirmDelete(event: StudentEvent) {
    Alert.alert(
      'Delete event?',
      `"${event.name}" and every student's permission request on it will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(event.id);
            try {
              await deleteEvent(event.id);
              queryClient.invalidateQueries({ queryKey: ['faculty-events'] });
            } catch (err) {
              Alert.alert('Could not delete event', err instanceof Error ? err.message : 'Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title="Events"
        subtitle="Create and manage student event permissions"
        onBack={() => router.replace('/erp' as never)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={eventsQuery.isFetching} onRefresh={() => eventsQuery.refetch()} />}
      >
        <Pressable style={styles.createButton} onPress={() => router.push('/events/create')}>
          <PlusIcon />
          <Text style={styles.createButtonText}>Create event</Text>
        </Pressable>

        {eventsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : (eventsQuery.data ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No events yet. Create one above.</Text>
        ) : (
          (eventsQuery.data ?? []).map((event) => (
            <Pressable
              key={event.id}
              style={[styles.card, cardShadow]}
              onPress={() => router.push(`/events/${event.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {event.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {event.location}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {formatDate(event.startsAt)} · {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                </Text>
                <Text style={styles.cardTeacher} numberOfLines={1}>
                  Monitoring teacher: {event.monitoringTeacherName}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmDelete(event)}
                disabled={deletingId === event.id}
                style={styles.deleteButton}
                hitSlop={8}
              >
                <TrashIcon />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: parentColors.blue,
    borderRadius: 14,
    paddingVertical: 15,
  },
  createButtonText: { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  emptyText: {
    textAlign: 'center',
    color: parentColors.muted,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  cardMeta: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  cardTeacher: {
    fontSize: 12.5,
    color: parentColors.mutedLight,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 6,
  },
  deleteButton: { padding: 6 },
});
