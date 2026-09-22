import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { accent, colors, fonts } from '@/lib/theme';
import { AiBotError, AiBotUnreachableError, askAssistant } from '@/lib/ai-bot-api';
import { AuthExpiredError } from '@/lib/auth';
import { DotGridBackground } from '@/components/ai-chat/DotGridBackground';
import { PavakieLogo3D } from '@/components/ai-chat/PavakieLogo3D';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

// Reachable via a button elsewhere (Home tile / menu entry), not a permanent
// bottom tab -- same hidden-route pattern as messaging-v2's own screens (see
// app/(protected)/ai-chat/_layout.tsx). Holds only local message list + input
// state + an opaque conversationId ref; the bot's own backend owns
// conversation history, this never resends it.
export function AiChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList>(null);

  async function handleSend() {
    const question = input.trim();
    if (!question || sending) return;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: question }]);
    setSending(true);

    try {
      const result = await askAssistant(question, conversationIdRef.current);
      conversationIdRef.current = result.conversationId;
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: result.answer }]);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        router.replace('/(auth)/login');
        return;
      }
      if (err instanceof AiBotError) {
        setError(
          err.retryAfterSeconds
            ? `The assistant is busy. Try again in ${err.retryAfterSeconds}s.`
            : err.message,
        );
        return;
      }
      if (err instanceof AiBotUnreachableError) {
        setError(err.message);
        return;
      }
      setError('Could not reach the assistant. Please try again shortly.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <GradientHeader title="Ask the Assistant" onBack={() => router.back()} />

      <View style={styles.listWrap}>
        <DotGridBackground />
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={messages.length === 0 ? styles.listContentEmpty : styles.listContent}
          data={messages}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <PavakieLogo3D size={104} />
              <Text style={styles.emptyTitle}>Ask the Assistant</Text>
              <Text style={styles.emptyText}>Ask a question about school records, policies or anything else — the assistant will help.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, item.role === 'user' && styles.rowOwn]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={[styles.text, item.role === 'user' && styles.textOwn]}>{item.text}</Text>
              </View>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      </View>

      {sending ? (
        <View style={styles.thinkingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.thinkingText}>Thinking…</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.composerRow}>
        <TextInput
          style={styles.composerInput}
          placeholder="Type your question..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending || !input.trim()}>
          {sending ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons name="send" size={18} color={colors.white} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listWrap: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  listContentEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  row: { alignSelf: 'flex-start', maxWidth: '82%', marginBottom: 12 },
  rowOwn: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: { backgroundColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleOwn: { backgroundColor: accent.blue, borderBottomRightRadius: 4 },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  textOwn: { color: colors.white },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  thinkingText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.errorText, paddingHorizontal: 16, paddingBottom: 8 },
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
