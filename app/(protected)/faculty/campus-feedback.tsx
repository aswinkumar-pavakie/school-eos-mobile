// Campus Feedback -- same Apply/History visual pattern as the other Campus
// tiles (see CampusRequestBody.tsx), but category is a fixed 5-value chip
// picker rather than a free-text field, so this screen is built standalone
// instead of forcing it through CampusRequestBody's generic text-field form.

import { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { facultyColors, parentColors } from '@/lib/theme';
import { listFeedback, createFeedback, type FeedbackCategory } from '@/lib/campus-api';
import { formatDate } from '@/lib/format';

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'FACILITIES', label: 'Facilities' },
  { value: 'FOOD', label: 'Food' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'OTHER', label: 'Other' },
];

export default function CampusFeedbackScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['campus-feedback'], queryFn: listFeedback });

  const [tab, setTab] = useState<'apply' | 'history'>('apply');
  const [category, setCategory] = useState<FeedbackCategory>('FACILITIES');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = message.trim().length >= 3;

  async function handleSubmit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await createFeedback({ category, message: message.trim() });
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['campus-feedback'] });
      setTab('history');
    } catch (err) {
      Alert.alert('Could not submit', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const history = query.data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Feedback" subtitle="Share feedback about campus" onBack={() => router.replace('/faculty/campus-hub' as never)} />
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabPill, tab === 'apply' && styles.tabPillActive]} onPress={() => setTab('apply')}>
          <Text style={[styles.tabPillText, tab === 'apply' && styles.tabPillTextActive]}>Apply</Text>
        </Pressable>
        <Pressable style={[styles.tabPill, tab === 'history' && styles.tabPillActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabPillText, tab === 'history' && styles.tabPillTextActive]}>History</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {tab === 'apply' ? (
          <>
            <Text style={styles.sectionLabel}>SHARE FEEDBACK</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.value}
                    style={[styles.chip, category === c.value && styles.chipActive]}
                    onPress={() => setCategory(c.value)}
                  >
                    <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>MESSAGE</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what's on your mind..."
                placeholderTextColor={facultyColors.muted}
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textarea]}
              />
              <Pressable style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} disabled={!canSubmit || saving} onPress={handleSubmit}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit feedback</Text>}
              </Pressable>
            </View>
          </>
        ) : query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No feedback submitted yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {history.map((f) => (
              <View key={f.id} style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{f.message}</Text>
                  <Text style={styles.rowMeta}>{formatDate(f.createdAt)}</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{f.category}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  tabPill: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border },
  tabPillActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  tabPillText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  tabPillTextActive: { color: '#fff' },
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginLeft: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: facultyColors.border, padding: 16 },
  fieldLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: facultyColors.borderLight, backgroundColor: facultyColors.rowBg },
  chipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  chipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  chipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, backgroundColor: facultyColors.rowBg, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 13, fontSize: 14, color: facultyColors.ink, marginBottom: 14 },
  textarea: { height: 96, textAlignVertical: 'top' },
  submitBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: parentColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  rowTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  categoryBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: facultyColors.blueTile },
  categoryBadgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
});
