// Present/Absent/Left count row + "Mark all present"/"Clear" bulk actions -- shared
// between Night Attendance and Study Attendance's roster screens (both mark a
// per-student PRESENT/ABSENT status against a roster). "Mark all present" reuses
// the existing mark-many endpoint (already accepts an array of entries) for every
// still-unmarked student in one call -- no new bulk endpoint invented. "Clear"
// does not (and cannot) erase a real mark server-side -- there is no unmark/delete
// endpoint -- so it just re-syncs the roster from the server (a plain refetch),
// undoing any stale local view rather than pretending to reset real attendance.

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { parentColors, cardShadow } from '@/lib/theme';

export interface RosterCounts {
  present: number;
  absent: number;
  left: number;
  total: number;
}

export function countRoster(roster: { status: string | null }[]): RosterCounts {
  const present = roster.filter((r) => r.status === 'PRESENT').length;
  const absent = roster.filter((r) => r.status === 'ABSENT').length;
  return { present, absent, left: roster.length - present - absent, total: roster.length };
}

export function RosterStatTiles({
  counts,
  onMarkAllPresent,
  onClear,
  busy,
}: {
  counts: RosterCounts;
  onMarkAllPresent: () => void;
  onClear: () => void;
  busy?: boolean;
}) {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.summary}>
        {counts.total} student{counts.total === 1 ? '' : 's'}
      </Text>
      <View style={styles.tileRow}>
        <View style={styles.tile}>
          <Text style={[styles.tileValue, { color: '#1E8A4C' }]}>{counts.present}</Text>
          <Text style={styles.tileLabel}>PRESENT</Text>
        </View>
        <View style={styles.tile}>
          <Text style={[styles.tileValue, { color: '#B33A2E' }]}>{counts.absent}</Text>
          <Text style={styles.tileLabel}>ABSENT</Text>
        </View>
        <View style={styles.tile}>
          <Text style={[styles.tileValue, { color: parentColors.ink }]}>{counts.left}</Text>
          <Text style={styles.tileLabel}>LEFT</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <Pressable style={[styles.bulkButton, styles.markAllButton]} onPress={onMarkAllPresent} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#1E8A4C" size="small" />
          ) : (
            <Text style={styles.markAllText}>Mark all present</Text>
          )}
        </Pressable>
        <Pressable style={[styles.bulkButton, styles.clearButton]} onPress={onClear} disabled={busy}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  summary: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep, marginBottom: 12 },
  tileRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, backgroundColor: parentColors.background, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  tileValue: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  tileLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, marginTop: 2, letterSpacing: 0.5 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  bulkButton: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  markAllButton: { backgroundColor: '#E6F6EC' },
  markAllText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, color: '#1E8A4C' },
  clearButton: { borderWidth: 1.5, borderColor: parentColors.border },
  clearText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, color: parentColors.ink },
});
