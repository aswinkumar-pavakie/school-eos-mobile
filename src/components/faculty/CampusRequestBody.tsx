// Shared Apply/History body for the 4 Campus request tiles (Food Court,
// Medical, Copy Center, Stationery Store) -- pixel-matches the reference
// design (gradient header handled by the caller's own AppHeader-style
// header; this owns the Apply/History segmented tabs, the form, and the
// history list), using this app's own existing colour tokens rather than
// the reference's own palette.

import { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { facultyColors, parentColors } from '@/lib/theme';

export interface CampusField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  required?: boolean;
}

export interface CampusHistoryItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
}

function statusColors(status: string) {
  if (status === 'COMPLETED' || status === 'CONFIRMED' || status === 'READY') return { bg: facultyColors.greenBg, fg: facultyColors.greenDark };
  if (status === 'CANCELLED') return { bg: facultyColors.redBg, fg: facultyColors.redDark };
  return { bg: facultyColors.amberBg, fg: facultyColors.amberDark };
}

export function CampusRequestBody({
  applyTitle,
  fields,
  submitLabel,
  onSubmit,
  history,
  isLoading,
  isFetching,
  onRefresh,
  emptyHistoryText,
}: {
  applyTitle: string;
  fields: CampusField[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  history: CampusHistoryItem[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  emptyHistoryText: string;
}) {
  const [tab, setTab] = useState<'apply' | 'history'>('apply');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const canSubmit = fields.filter((f) => f.required !== false).every((f) => (values[f.key] ?? '').trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await onSubmit(values);
      setValues({});
      setTab('history');
    } catch (err) {
      Alert.alert('Could not submit', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.flex}>
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
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
      >
        {tab === 'apply' ? (
          <>
            <Text style={styles.sectionLabel}>{applyTitle.toUpperCase()}</Text>
            <View style={styles.card}>
              {fields.map((f) => (
                <View key={f.key} style={{ marginBottom: 4 }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    value={values[f.key] ?? ''}
                    onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={facultyColors.muted}
                    multiline={f.multiline}
                    numberOfLines={f.multiline ? 3 : 1}
                    keyboardType={f.keyboardType ?? 'default'}
                    style={[styles.input, f.multiline && styles.textarea]}
                  />
                </View>
              ))}
              <Pressable style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} disabled={!canSubmit || saving} onPress={handleSubmit}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{submitLabel}</Text>}
              </Pressable>
            </View>
          </>
        ) : isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>{emptyHistoryText}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {history.map((h) => {
              const colors = statusColors(h.status);
              return (
                <View key={h.id} style={styles.row}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{h.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={2}>{h.subtitle}</Text>
                  </View>
                  <View style={[styles.stateBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.stateBadgeText, { color: colors.fg }]}>{h.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  tabPill: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border },
  tabPillActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  tabPillText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  tabPillTextActive: { color: '#fff' },
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginLeft: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: facultyColors.border, padding: 16, gap: 4 },
  fieldLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: facultyColors.borderLight, backgroundColor: facultyColors.rowBg, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 13, fontSize: 14, color: facultyColors.ink, marginBottom: 12 },
  textarea: { height: 78, textAlignVertical: 'top' },
  submitBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: parentColors.blue },
  submitBtnDisabled: { backgroundColor: facultyColors.disabled },
  submitBtnText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold' },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  rowTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  stateBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  stateBadgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
