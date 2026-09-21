// The recurring stat-tile row -- pixel-matches the design's own repeating
// `stats`/4-tile grid pattern (white card, uppercase muted label, bold big
// value). Same shape as src/components/faculty/StatCards.tsx, just on
// principalColors -- kept as its own file per this module's token-isolation
// rule (see theme.ts's own principalColors comment).

import { StyleSheet, Text, View } from 'react-native';
import { principalColors, cardShadow } from '@/lib/theme';

export interface StatCardItem {
  label: string;
  value: string;
  valueColor?: string;
}

export function StatCards({ items }: { items: StatCardItem[] }) {
  return (
    <View style={styles.row}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={[styles.card, cardShadow]}>
          <Text style={[styles.label, it.valueColor ? { color: it.valueColor } : null]} numberOfLines={1}>
            {it.label.toUpperCase()}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: principalColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: principalColors.border,
    padding: 15,
    gap: 5,
  },
  label: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.tertiary, letterSpacing: 1 },
  value: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, letterSpacing: -0.5 },
});
