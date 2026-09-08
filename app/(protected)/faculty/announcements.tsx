// Announcements -- full CRUD (create/edit/delete), pixel-matches the
// design's feed + bottom-sheet composer. Audience is always SECTION here,
// picked from this faculty member's own advisor + teaching sections
// (unioned client-side from the two scope lists, re-validated server-side
// regardless) -- the design's own SCHOOL/ROLE audience options stay
// Admin-only, out of scope for Faculty.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { PlusIcon, TrashIcon, EditIcon, CloseIcon, ChevronRightIcon, CheckCircleIcon } from '@/components/faculty/icons';
import { listAdvisorSections, listTeachingOfferings } from '@/lib/faculty-scope-api';
import {
  listFeedAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from '@/lib/faculty-announcements-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

export default function AnnouncementsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const feedQuery = useQuery({ queryKey: ['faculty-announcements-feed'], queryFn: listFeedAnnouncements });
  const advisorSectionsQuery = useQuery({ queryKey: ['faculty-advisor-sections'], queryFn: listAdvisorSections });
  const teachingOfferingsQuery = useQuery({ queryKey: ['faculty-teaching-offerings'], queryFn: listTeachingOfferings });

  const sectionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of advisorSectionsQuery.data ?? []) map.set(s.sectionId, `${s.gradeName} ${s.sectionName}`);
    for (const o of teachingOfferingsQuery.data ?? []) if (!map.has(o.sectionId)) map.set(o.sectionId, `${o.gradeName} ${o.sectionName}`);
    return [...map.entries()].map(([key, label]) => ({ key, label }));
  }, [advisorSectionsQuery.data, teachingOfferingsQuery.data]);

  function openComposer(announcement?: Announcement) {
    if (announcement) {
      setEditing(announcement);
      setTitle(announcement.title);
      setBody(announcement.body);
      setSelectedSections(new Set(announcement.audiences.filter((a) => a.audienceType === 'SECTION' && a.targetId).map((a) => a.targetId!)));
    } else {
      setEditing(null);
      setTitle('');
      setBody('');
      setSelectedSections(new Set());
    }
    setComposerOpen(true);
  }

  function toggleSection(key: string) {
    setSelectedSections((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const canPost = title.trim().length > 0 && selectedSections.size > 0;

  async function handlePost() {
    if (!canPost) return;
    setSaving(true);
    try {
      const input = { title: title.trim(), body: body.trim(), priority: 'NORMAL', targetSectionIds: [...selectedSections] };
      if (editing) await updateAnnouncement(editing.id, input);
      else await createAnnouncement(input);
      queryClient.invalidateQueries({ queryKey: ['faculty-announcements-feed'] });
      setComposerOpen(false);
    } catch (err) {
      Alert.alert('Could not save announcement', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(a: Announcement) {
    Alert.alert('Delete announcement?', `"${a.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAnnouncement(a.id);
            queryClient.invalidateQueries({ queryKey: ['faculty-announcements-feed'] });
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Announcements" subtitle="School, role & your classes" onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={feedQuery.isFetching} onRefresh={() => feedQuery.refetch()} />}
      >
        <Pressable style={styles.postButton} onPress={() => openComposer()}>
          <PlusIcon />
          <Text style={styles.postButtonText}>Post an announcement</Text>
          <ChevronRightIcon color="rgba(255,255,255,.75)" />
        </Pressable>

        {feedQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (feedQuery.data ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No announcements yet.</Text>
        ) : (
          (feedQuery.data ?? []).map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                {a.canEdit ? (
                  <View style={styles.cardActions}>
                    <Pressable hitSlop={8} onPress={() => openComposer(a)}>
                      <EditIcon />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(a)}>
                      <TrashIcon />
                    </Pressable>
                  </View>
                ) : null}
              </View>
              {a.body ? <Text style={styles.cardBody}>{a.body}</Text> : null}
              <Text style={styles.cardPlace}>
                {a.audiences.map((aud) => (aud.audienceType === 'SCHOOL' ? 'Whole school' : aud.audienceType === 'ROLE' ? aud.targetRole : sectionOptions.find((s) => s.key === aud.targetId)?.label ?? 'Class')).join(', ')}
              </Text>
              <Text style={styles.cardDate}>{formatDate(a.createdAt)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{editing ? 'Edit announcement' : 'New announcement'}</Text>
                  <Text style={styles.sheetSubtitle}>Visible to the classes you select</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setComposerOpen(false)}>
                  <CloseIcon />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Bring graph sheets tomorrow" style={styles.input} />

              <Text style={styles.fieldLabel}>DETAILS</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Optional message"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textarea]}
              />

              <View style={styles.audienceHeader}>
                <Text style={styles.fieldLabel}>TARGET CLASSES</Text>
                <Text style={styles.audienceCount}>{selectedSections.size} selected</Text>
              </View>
              <View style={{ gap: 8 }}>
                {sectionOptions.map((o) => {
                  const active = selectedSections.has(o.key);
                  return (
                    <Pressable key={o.key} style={[styles.audienceOption, active && styles.audienceOptionActive]} onPress={() => toggleSection(o.key)}>
                      <Text style={[styles.audienceLabel, active && { color: facultyColors.blueDark }]}>{o.label}</Text>
                      {active ? <CheckCircleIcon size={20} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={[styles.postSubmit, !canPost && styles.postSubmitDisabled]} disabled={!canPost || saving} onPress={handlePost}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.postSubmitText}>{editing ? 'Save changes' : 'Post announcement'}</Text>}
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
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  postButton: { backgroundColor: facultyColors.blue, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  postButtonText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 14, paddingTop: 2 },
  cardBody: { fontSize: 13.5, color: facultyColors.body, lineHeight: 20, marginTop: 8, fontFamily: 'PlusJakartaSans_500Medium' },
  cardPlace: { fontSize: 12.5, color: facultyColors.mutedStrong, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 8 },
  cardDate: { fontSize: 12, color: facultyColors.muted, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  sheetSubtitle: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: facultyColors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, color: facultyColors.ink },
  textarea: { height: 84, textAlignVertical: 'top' },
  audienceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  audienceCount: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blue },
  audienceOption: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: facultyColors.rowBg, borderWidth: 1, borderColor: facultyColors.borderSoft },
  audienceOptionActive: { backgroundColor: facultyColors.blueLight, borderColor: facultyColors.blue },
  audienceLabel: { flex: 1, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  postSubmit: { marginTop: 18, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: facultyColors.blue },
  postSubmitDisabled: { backgroundColor: facultyColors.disabled },
  postSubmitText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
