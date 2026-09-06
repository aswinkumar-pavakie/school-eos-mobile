// Shared status-pill visual used by ParentOnlineClassHubScreen,
// FacultyOnlineClassHubScreen, and OnlineClassDetailScreen -- kept as one component so
// the three screens can't visually drift from each other. The label text (which
// differs: "Starts in 12 min" vs "Scheduled" vs "Live now") stays each screen's own
// business, this only renders the tone.

import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import type { OnlineClassStatus } from '../types';

type Tone = 'live' | 'neutral' | 'alert';

const TONE_BY_STATUS: Record<OnlineClassStatus, Tone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'neutral',
  LIVE: 'live',
  COMPLETED: 'neutral',
  CANCELLED: 'alert',
};

export function SessionStatusPill({ status, label }: { status: OnlineClassStatus; label: string }) {
  const tone = TONE_BY_STATUS[status];
  return (
    <View style={[styles.pill, tone !== 'neutral' && styles.pillAlert]}>
      {tone === 'live' ? <View style={styles.dot} /> : null}
      <Text style={[styles.text, tone !== 'neutral' && styles.textAlert]}>{label}</Text>
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
    backgroundColor: colors.border,
  },
  pillAlert: { backgroundColor: colors.errorBg },
  text: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  textAlert: { color: colors.errorText },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.errorText },
});
