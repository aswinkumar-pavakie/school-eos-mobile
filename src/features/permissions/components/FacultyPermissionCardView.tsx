import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import type { PermissionActivity } from '../types';
import { formatDateDisplay, formatTimeRange } from '../utils';
import { PermissionStatusPill, toneForActivityStatus } from './PermissionStatusPill';

export function FacultyPermissionCardView({ item }: { item: PermissionActivity }) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(protected)/my-class/permissions/history/${item.id}` as never)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <PermissionStatusPill
          tone={toneForActivityStatus(item.status)}
          label={item.status === 'CANCELLED' ? 'Cancelled' : 'Active'}
        />
      </View>

      <Text style={styles.meta}>
        {item.gradeName}-{item.sectionName} · {formatDateDisplay(item.activityDate)} ·{' '}
        {formatTimeRange(item.startTime, item.endTime)}
      </Text>
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.footerNote}>Deadline: {formatDateDisplay(item.responseDeadline)}</Text>
        <Text style={styles.studentCount}>{item.studentCount} students</Text>
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
    marginHorizontal: 20,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  meta: { marginTop: 4, fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  description: { marginTop: 8, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 14, marginBottom: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  footerNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  studentCount: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
});
