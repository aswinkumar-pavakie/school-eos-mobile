import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { ErrorState, LoadingState } from '@/components/ScreenStates';
import { accent, colors, fonts } from '@/lib/theme';
import { useMe } from '@/hooks/useMe';
import { getErrorMessage } from '@/lib/api';
import { getSendMessageErrorMessage } from '@/services/e2ee/error-messages';
import {
  useAcceptRequest,
  useConversationDetail,
  useDeclineRequest,
  useMarkRead,
  useMessages,
  useRequests,
  useSendMessage,
} from '../hooks';
import { resolveDisplayName } from '../nameCache';
import { MessageBubble } from '../components/MessageBubble';
import { RequestBanner } from '../components/RequestBanner';

export function ConversationScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const me = useMe();
  const ownPersonId = me.data?.person.id;

  const conversation = useConversationDetail(conversationId);
  // Only starts decrypting once the join (performed by useConversationDetail
  // above, a genuinely separate query) has actually completed -- see
  // useMessages's own comment for why this can't just be "conversationId is
  // known".
  const messages = useMessages(conversationId, conversation.isSuccess);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkRead(conversationId);
  const incomingRequests = useRequests('PENDING', 'recipient');
  const outgoingRequests = useRequests('PENDING', 'requester');
  const acceptRequest = useAcceptRequest();
  const declineRequest = useDeclineRequest();

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const pendingRequest =
    incomingRequests.data?.find((r) => r.conversationId === conversationId) ??
    outgoingRequests.data?.find((r) => r.conversationId === conversationId);

  const otherPersonId =
    conversation.data && ownPersonId
      ? conversation.data.personAId === ownPersonId
        ? conversation.data.personBId
        : conversation.data.personAId
      : undefined;

  useEffect(() => {
    if (!messages.data || messages.data.length === 0 || !ownPersonId) return;
    const last = messages.data[messages.data.length - 1];
    if (last && last.senderPersonId !== ownPersonId) {
      markRead.mutate(last.sequence);
    }
    // Only when the message set actually changes -- not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.data?.length]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    try {
      await sendMessage.mutateAsync(trimmed);
    } catch (err) {
      // Previously uncaught -- a send failure (network, or an E2EE state
      // error) propagated with no user feedback at all, silently losing the
      // draft text.
      Alert.alert('Message not sent', getSendMessageErrorMessage(err, getErrorMessage(err, 'Please try again.')));
      setDraft(trimmed);
    }
  }

  if (conversation.isLoading || me.isLoading) return <LoadingState />;
  if (conversation.isError || !ownPersonId) {
    return (
      <ErrorState
        message="Couldn't open this conversation."
        onRetry={() => conversation.refetch()}
      />
    );
  }

  // Neither party can send while a request is PENDING -- the recipient must
  // accept/decline first, and the requester already used their one allowed
  // message (LLD's one-message-while-pending rule; the server enforces this
  // independently, this just keeps the UI from offering an action that would
  // only bounce with REQUEST_PENDING).
  const canSend = !pendingRequest;
  const otherName = otherPersonId ? resolveDisplayName(otherPersonId) : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <GradientHeader title={otherName} onBack={() => router.back()} />

      {pendingRequest ? (
        <RequestBanner
          request={pendingRequest}
          ownPersonId={ownPersonId}
          isDeciding={acceptRequest.isPending || declineRequest.isPending}
          onAccept={() => acceptRequest.mutate(pendingRequest.id)}
          onDecline={() => declineRequest.mutate(pendingRequest.id)}
        />
      ) : null}

      {messages.isLoading ? (
        <LoadingState />
      ) : messages.isError ? (
        <ErrorState message="Couldn't load messages." onRetry={() => messages.refetch()} />
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.senderPersonId === ownPersonId} />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {canSend ? (
        <View style={styles.composerRow}>
          <TextInput
            style={styles.composerInput}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable
            style={styles.sendButton}
            onPress={handleSend}
            disabled={sendMessage.isPending || !draft.trim()}
          >
            {sendMessage.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 8 },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
