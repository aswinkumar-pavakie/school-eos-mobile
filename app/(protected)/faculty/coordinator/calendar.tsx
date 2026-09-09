// Academic Coordinator -- Academic Calendar CRUD over the real calendar_event
// table (the same one the already-shipped, read-only Faculty Calendar screen
// reads) -- always scoped to one of the coordinator's own real stages, so
// anything created here appears immediately, in real time, in every other
// faculty member's own Calendar tab for that stage.

import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { PlusIcon, TrashIcon, EditIcon, CloseIcon } from '@/components/faculty/icons';
import {
  getCoordinatorMe,
  listCoordinatorCalendarEvents,
  createCoordinatorCalendarEvent,
  updateCoordinatorCalendarEvent,
  deleteCoordinatorCalendarEvent,
  type CoordinatorCalendarEvent,
} from '@/lib/faculty-academic-coordinator-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

const EVENT_TYPES = ['HOLIDAY', 'TERM_START', 'TERM_END', 'EXAM_WINDOW', 'PTM', 'FUNCTION', 'COMPETITION', 'WORKING_SATURDAY', 'OTHER'];
const STAGE_LABELS: Record<string, string> = {
  PRE_PRIMARY: 'Pre-Primary', PRIMARY: 'Primary', MIDDLE: 'Middle', SECONDARY: 'Secondary', HIGHER_SECONDARY: 'Higher Secondary',
};

export default function CoordinatorCalendarScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CoordinatorCalendarEvent | null>(null);
  const [scopeStage, setScopeStage] = useState('');
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]!);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const meQuery = useQuery({ queryKey: ['faculty-academic-coordinator-me'], queryFn: getCoordinatorMe });
  const eventsQuery = useQuery({ queryKey: ['coordinator-calendar'], queryFn: listCoordinatorCalendarEvents });
  const stages = meQuery.data?.stages ?? [];

  function openComposer(event?: CoordinatorCalendarEvent) {
    if (event) {
      setEditing(event);
      setScopeStage(event.scopeStage ?? '');
      setTitle(event.title);
      setEventType(event.eventType);
      setStartDate(event.startDate.slice(0, 10));
      setEndDate(event.endDate.slice(0, 10));
    } else {
      setEditing(null);
      setScopeStage(stages[0] ?? '');
      setTitle('');
      setEventType(EVENT_TYPES[0]!);
      setStartDate('');
      setEndDate('');
    }
    setComposerOpen(true);
  }

  const canSave = title.trim().length > 0 && startDate.trim().length > 0 && endDate.trim().length > 0 && !!scopeStage;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCoordinatorCalendarEvent(editing.id, { title: title.trim(), eventType, startDate, endDate });
      } else {
        await createCoordinatorCalendarEvent({ scopeStage, title: title.trim(), eventType, startDate, endDate });
      }
      queryClient.invalidateQueries({ queryKey: ['coordinator-calendar'] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not save event', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(event: CoordinatorCalendarEvent) {
    Alert.alert('Delete this event?', `"${event.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCoordinatorCalendarEvent(event.id);
            queryClient.invalidateQueries({ queryKey: ['coordinator-calendar'] });
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  const events = eventsQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Academic Calendar" subtitle="Your stage's own events" onBack={() => router.replace('/faculty/coordinator' as never)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={eventsQuery.isFetching} onRefresh={() => eventsQuery.refetch()} />}>
        <Pressable style={styles.addButton} onPress={() => openComposer()}>
          <PlusIcon />
          <Text style={styles.addButtonText}>New event</Text>
        </Pressable>

        {eventsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>No events yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {events.map((e) => (
              <View key={e.id} style={styles.card}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle}>{e.title}</Text>
                  <Text style={styles.cardMeta}>
                    {formatDate(e.startDate)}{e.endDate !== e.startDate ? ` – ${formatDate(e.endDate)}` : ''} · {e.eventType.replace('_', ' ')}
                    {e.scopeType === 'STAGE' ? ` · ${STAGE_LABELS[e.scopeStage ?? ''] ?? e.scopeStage}` : ' · School-wide'}
                  </Text>
                </View>
                {e.scopeType === 'STAGE' ? (
                  <View style={styles.cardActions}>
                    <Pressable hitSlop={8} onPress={() => openComposer(e)}><EditIcon /></Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(e)}><TrashIcon /></Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{editing ? 'Edit event' : 'New event'}</Text></View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}><CloseIcon /></Pressable>
              </View>

              {stages.length > 1 && !editing ? (
                <>
                  <Text style={styles.fieldLabel}>STAGE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {stages.map((s) => (
                      <Pressable key={s} style={[styles.chip, scopeStage === s && styles.chipActive]} onPress={() => setScopeStage(s)}>
                        <Text style={[styles.chipText, scopeStage === s && styles.chipTextActive]}>{STAGE_LABELS[s] ?? s}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={styles.fieldLabel}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Science Exhibition" style={styles.input} />

              <Text style={styles.fieldLabel}>TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {EVENT_TYPES.map((t) => (
                  <Pressable key={t} style={[styles.chip, eventType === t && styles.chipActive]} onPress={() => setEventType(t)}>
                    <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{t.replace('_', ' ')}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>START DATE</Text>
              <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" style={styles.input} />

              <Text style={styles.fieldLabel}>END DATE</Text>
              <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" style={styles.input} />

              <Pressable style={[styles.submitBtn, !canSave && styles.submitBtnDisabled]} disabled={!canSave || saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editing ? 'Save changes' : 'Create event'}</Text>}
              </Pressable>
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
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16 },
  addButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 14 },
  chipRow: { flexDirection: 'row', gap: 7 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight },
  chipActive: { backgroundColor: facultyColors.blue, borderColor: facultyColors.blue },
  chipText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  chipTextActive: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  submitBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
