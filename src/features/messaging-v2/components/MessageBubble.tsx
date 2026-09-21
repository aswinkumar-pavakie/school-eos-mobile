import { StyleSheet, Text, View } from 'react-native';
import { accent, colors, fonts } from '@/lib/theme';
import type { DecryptedMessage } from '../types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  message,
  isOwn,
}: {
  message: DecryptedMessage;
  isOwn: boolean;
}) {
  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.plaintext}</Text>
      </View>
      <Text style={styles.meta}>{formatTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignSelf: 'flex-start', maxWidth: '82%', marginBottom: 12 },
  rowOwn: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: { backgroundColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleOwn: { backgroundColor: accent.blue, borderBottomRightRadius: 4 },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  textOwn: { color: colors.white },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
});
