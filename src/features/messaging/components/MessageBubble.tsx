import { StyleSheet, Text, View } from 'react-native';
import { accent, colors, fonts } from '@/lib/theme';
import type { Message } from '../types';
import { formatBubbleTime } from '../utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  translatedText?: string;
}

export function MessageBubble({ message, isOwn, translatedText }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
        {translatedText ? (
          <View style={[styles.translationBlock, isOwn ? styles.translationBlockOwn : styles.translationBlockOther]}>
            <Text style={[styles.translationLabel, isOwn && styles.textOwn]}>Translated</Text>
            <Text style={[styles.translationText, isOwn && styles.textOwn]}>{translatedText}</Text>
          </View>
        ) : null}
      </View>
      {isOwn ? (
        <Text style={styles.meta}>
          {formatBubbleTime(message.createdAt)}
          {message.readAt ? ' · Read' : ''}
        </Text>
      ) : (
        <Text style={styles.meta}>{formatBubbleTime(message.createdAt)}</Text>
      )}
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
  translationBlock: { marginTop: 8, paddingTop: 8, gap: 2 },
  translationBlockOther: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  translationBlockOwn: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)' },
  translationLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' },
  translationText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
});
