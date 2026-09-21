// Sports Admin -> Selection Window. Real listSelectionWindows()/
// createSelectionWindow() -- POST/PATCH/DELETE /sports/selection-windows, a
// genuine backend gap confirmed by audit and built new for this feature
// (see migration 0026_sports_practice_results_selection_substitute.sql).
// Deliberately its own entity, distinct from sports_trial (a candidate's own
// trial record) -- this is the surrounding administrative window.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { createSelectionWindow, listSelectionWindows, listSports, updateSelectionWindow, type SelectionWindowStatus } from '@/lib/sports-api';

const STATUS_LABEL: Record<SelectionWindowStatus, string> = { DRAFT: 'draft', OPEN: 'open', CLOSED: 'closed' };

export default function SelectionWindowScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [sportId, setSportId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [opensOn, setOpensOn] = useState('');
  const [closesOn, setClosesOn] = useState('');

  const windowsQuery = useQuery({ queryKey: ['sports-selection-windows'], queryFn: listSelectionWindows });
  const sportsQuery = useQuery({ queryKey: ['sports-list'], queryFn: listSports, enabled: showAdd });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!sportId || !title.trim() || !opensOn || !closesOn) throw new Error('Pick a sport, title and date range.');
      return createSelectionWindow({ sportId, title: title.trim(), opensOn, closesOn });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-selection-windows'] });
      setShowAdd(false);
      setSportId(null);
      setTitle('');
      setOpensOn('');
      setClosesOn('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SelectionWindowStatus }) => updateSelectionWindow(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-selection-windows'] }),
  });

  const sorted = [...(windowsQuery.data ?? [])].sort((a, b) => new Date(b.opensOn).getTime() - new Date(a.opensOn).getTime());

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Selection window" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Open window'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Sport</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(sportsQuery.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => setSportId(s.id)} style={[styles.chip, sportId === s.id && styles.chipActive]}>
                  <Text style={[styles.chipText, sportId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="U16 squad selection" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Opens on (YYYY-MM-DD)</Text>
            <TextInput value={opensOn} onChangeText={setOpensOn} placeholder="2026-10-01" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Closes on (YYYY-MM-DD)</Text>
            <TextInput value={closesOn} onChangeText={setClosesOn} placeholder="2026-10-10" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Open window'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Windows</Text>
          <Text style={styles.count}>{sorted.length} window{sorted.length === 1 ? '' : 's'}</Text>
        </View>
        {sorted.length === 0 ? (
          <EmptyPanel label="No selection windows yet." />
        ) : (
          sorted.map((w) => (
            <Card key={w.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{w.title}</Text>
                  <Text style={styles.rowSub}>{w.sportName}</Text>
                </View>
                <StatusPill label={STATUS_LABEL[w.status]} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Window</Text>
                  <Text style={styles.metaValue}>{w.opensOn} → {w.closesOn}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {(['DRAFT', 'OPEN', 'CLOSED'] as SelectionWindowStatus[]).map((s) => (
                  <Pressable
                    key={s}
                    disabled={statusMutation.isPending}
                    onPress={() => s !== w.status && statusMutation.mutate({ id: w.id, status: s })}
                    style={[styles.chip, w.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, w.status === s && styles.chipTextActive]}>{STATUS_LABEL[s]}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  addButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: sportsColors.tertiary },
  input: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: sportsColors.ink },
  chip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  chipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  error: { fontSize: 12.5, color: sportsColors.red },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingTop: 2 },
  title: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  count: { fontSize: 11.5, color: sportsColors.tertiary },
  rowCard: { gap: 12, padding: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, lineHeight: 19 },
  rowSub: { fontSize: 12.5, color: sportsColors.mutedStrong },
  metaBlock: { gap: 7, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, paddingTop: 11 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaKey: { flex: 1, fontSize: 12, color: sportsColors.tertiary },
  metaValue: { flex: 1.2, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong, textAlign: 'right' },
});
