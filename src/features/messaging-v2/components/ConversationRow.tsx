import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import type { ConversationSummary } from '@/lib/messaging-api';
import { resolveDisplayName } from '../nameCache';
import { Avatar } from './Avatar';

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationRow({
  conversation,
  ownPersonId,
  onPress,
}: {
  conversation: ConversationSummary;
  ownPersonId: string;
  onPress: () => void;
}) {
  const otherPersonId =
    conversation.personAId === ownPersonId
      ? conversation.personBId
      : conversation.personAId;
  const name = resolveDisplayName(otherPersonId);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar name={name} />
      <View style={styles.textBlock}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(conversation.lastMessageAt)}</Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={styles.preview} numberOfLines={1}>
            {conversation.mlsWelcome ? 'New conversation' : 'Encrypted message'}
          </Text>
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
  textBlock: { flex: 1, gap: 4 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, flexShrink: 1 },
  timestamp: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  bottomLine: { flexDirection: 'row', alignItems: 'center' },
  preview: { fontSize: 13, color: colors.textMuted, flex: 1 },
});
