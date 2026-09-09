// Generic status pill -- used across every Hostel Warden list/detail screen
// (attendance status, request state, visitor open/exited, complaint state).
// Lives here (not inside hostel-warden) since it's generic enough that any future
// feature could reuse it, matching this app's "shared components live flat in
// src/components" convention.

import { StyleSheet, Text, View } from 'react-native';

export type StatusTone = 'positive' | 'negative' | 'neutral' | 'warning';

const TONE_COLORS: Record<StatusTone, { bg: string; fg: string }> = {
  positive: { bg: '#E6F6EC', fg: '#1E8A4C' },
  negative: { bg: '#FDECEA', fg: '#B33A2E' },
  neutral: { bg: '#EFF3FA', fg: '#5C6B84' },
  warning: { bg: '#FFF4E0', fg: '#B77A0A' },
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const { bg, fg } = TONE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
});
