import { Pressable, StyleSheet, Text, View } from 'react-native';
import { accent, colors, fonts } from '@/lib/theme';
import type { ConversationSummary } from '../types';
import { findParentContact, formatConversationTimestamp, primaryTeacherContact, ROLE_LABELS } from '../utils';
import { Avatar } from './Avatar';

interface ConversationRowProps {
  conversation: ConversationSummary;
  isFaculty: boolean;
  onPress: () => void;
  /** Lowercased, trimmed search text currently active on the list, if any --
   * lets a Parent's row show the specific teacher that matched (a subject
   * teacher who isn't the default primary contact), the same way Faculty's row
   * always shows the exact student name they searched for. Without this, a
   * search that correctly matches a non-primary participant still displayed the
   * unrelated primary contact's name, making the match look wrong. */
  query?: string;
}

export function ConversationRow({ conversation, isFaculty, onPress, query }: ConversationRowProps) {
  let name: string;
  let subtitle: string;

  if (conversation.conversationType === 'STAFF_DIRECT') {
    // Direct thread -- always exactly one other party, never a class/ward to
    // describe. Principal sees the Faculty's name; Faculty sees "Principal".
    name = conversation.directParticipant?.name ?? 'Conversation';
    subtitle = conversation.directParticipant ? ROLE_LABELS[conversation.directParticipant.role] : '';
  } else if (isFaculty) {
    // Faculty cares which ward/parent this thread is about, not which co-teacher
    // is also in it.
    const parent = findParentContact(conversation.participants);
    name = conversation.student?.name ?? 'Conversation';
    subtitle = parent
      ? `${parent.name} · ${conversation.grade?.name}-${conversation.section?.name}`
      : `${conversation.grade?.name}-${conversation.section?.name}`;
  } else {
    const matched = query ? conversation.participants.find((p) => p.name.toLowerCase().includes(query)) : undefined;
    const teacher = matched ?? primaryTeacherContact(conversation.participants);
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
