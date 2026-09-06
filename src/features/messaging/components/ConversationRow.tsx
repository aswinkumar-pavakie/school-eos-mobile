import { Pressable, StyleSheet, Text, View } from 'react-native';
import { accent, colors, fonts } from '@/lib/theme';
import type { ConversationSummary } from '../types';
import { findParentContact, formatConversationTimestamp, primaryTeacherContact, ROLE_LABELS } from '../utils';
import { Avatar } from './Avatar';

interface ConversationRowProps {
  conversation: ConversationSummary;
  isFaculty: boolean;
  onPress: () => void;
}

export function ConversationRow({ conversation, isFaculty, onPress }: ConversationRowProps) {
  let name: string;
  let subtitle: string;

  if (isFaculty) {
    // Faculty cares which ward/parent this thread is about, not which co-teacher
    // is also in it.
    const parent = findParentContact(conversation.participants);
    name = conversation.student.name;
    subtitle = parent
      ? `${parent.name} · ${conversation.grade.name}-${conversation.section.name}`
      : `${conversation.grade.name}-${conversation.section.name}`;
  } else {
    const teacher = primaryTeacherContact(conversation.participants);
    name = teacher?.name ?? 'Conversation';
    subtitle = teacher ? ROLE_LABELS[teacher.role] : '';
  }

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Avatar name={name} />
      <View style={styles.textBlock}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {conversation.lastMessageAt ? (
            <Text style={styles.timestamp}>{formatConversationTimestamp(conversation.lastMessageAt)}</Text>
          ) : null}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.bottomLine}>
          <Text style={styles.preview} numberOfLines={1}>
            {conversation.lastMessage?.text ?? 'No messages yet'}
          </Text>
          {conversation.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  textBlock: { flex: 1, gap: 2 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, flex: 1 },
  timestamp: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  preview: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: accent.blue },
});
