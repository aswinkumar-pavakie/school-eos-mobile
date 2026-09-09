// The recurring 3-up (sometimes fewer) stat-card row -- pixel-matches every
// design screen's own `stats`/`pageStats`/`hwStats` row: white card, 9.5px
// muted label, bold value.

import { StyleSheet, Text, View } from 'react-native';
import { facultyColors, cardShadow } from '@/lib/theme';

export interface StatCardItem {
  label: string;
  value: string;
  valueColor?: string;
}

export function StatCards({ items }: { items: StatCardItem[] }) {
  return (
    <View style={styles.row}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={styles.card}>
          <Text style={styles.label} numberOfLines={1}>
            {it.label}
          </Text>
          <Text style={[styles.value, it.valueColor ? { color: it.valueColor } : null]} numberOfLines={1}>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    backgroundColor: facultyColors.surface,
    borderWidth: 1,
    borderColor: facultyColors.border,
    borderRadius: 14,
    padding: 12,
    ...cardShadow,
  },
  label: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.9 },
  value: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, marginTop: 5 },
});
