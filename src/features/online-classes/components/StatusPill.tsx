import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import type { OnlineClassStatus } from '../types';
import { STATUS_LABELS } from '../utils';

const PILL_COLORS: Record<OnlineClassStatus, { bg: string; text: string }> = {
  DRAFT: { bg: colors.border, text: colors.textMuted },
  SCHEDULED: { bg: '#EAF1FB', text: colors.primary },
  LIVE: { bg: colors.errorBg, text: colors.errorText },
  COMPLETED: { bg: colors.border, text: colors.text },
  CANCELLED: { bg: colors.errorBg, text: colors.errorText },
};

export function StatusPill({ status }: { status: OnlineClassStatus }) {
  const palette = PILL_COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      {status === 'LIVE' ? <View style={styles.liveDot} /> : null}
      <Text style={[styles.text, { color: palette.text }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.errorText,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
