import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { accent, colors, fonts } from '@/lib/theme';
import type { RequestSummary } from '@/lib/messaging-api';

export function RequestBanner({
  request,
  ownPersonId,
  onAccept,
  onDecline,
  isDeciding,
}: {
  request: RequestSummary;
  ownPersonId: string;
  onAccept: () => void;
  onDecline: () => void;
  isDeciding: boolean;
}) {
  const isRecipient = request.recipientPersonId === ownPersonId;

  if (!isRecipient) {
    return (
      <View style={styles.banner}>
        <Text style={styles.text}>Waiting for a response to your message request.</Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>This person wants to message you. Only one message is allowed until you respond.</Text>
      {isDeciding ? (
        <ActivityIndicator color={accent.blue} style={styles.spinner} />
      ) : (
        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.declineButton]} onPress={onDecline}>
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.acceptButton]} onPress={onAccept}>
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF6E5',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  text: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  declineButton: { borderWidth: 1, borderColor: colors.border },
  declineText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },
  acceptButton: { backgroundColor: accent.blue },
  acceptText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  spinner: { alignSelf: 'center' },
});
