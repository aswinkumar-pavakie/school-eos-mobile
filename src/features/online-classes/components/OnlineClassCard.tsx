import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import type { OnlineClassCommon } from '../types';
import { formatClassDate, formatClassTimeRange } from '../utils';
import { StatusPill } from './StatusPill';

interface OnlineClassCardProps {
  item: OnlineClassCommon;
  onPress: () => void;
  /** Role-specific action area (Join button for Parent, Start/Join/Complete for Faculty). */
  actions?: ReactNode;
}

export function OnlineClassCard({ item, onPress, actions }: OnlineClassCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.subject} numberOfLines={1}>
            {item.subjectName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.gradeName} - {item.sectionName}
          </Text>
        </View>
        <StatusPill status={item.status} />
      </View>

      <Text style={styles.topic} numberOfLines={2}>
        {item.topic}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.schedule} numberOfLines={1}>
          {formatClassDate(item.scheduledDate)} - {formatClassTimeRange(item.startTime, item.endTime)}
        </Text>
        {actions}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleBlock: { flex: 1, gap: 2 },
  subject: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  topic: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  schedule: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});
