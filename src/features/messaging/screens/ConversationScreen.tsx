// The conversation is shared by every authorized faculty for this ward's class, not
// a single named 1:1 thread -- but the header is role-specific, never a "+N more"
// summary: a Parent sees the relevant teacher (class advisor preferred), a Faculty
// sees the ward/class plus the parent's name below. See feature README.
//
// "Translate" is a per-message backend operation (POST .../messages/:messageId/
// translate); tapping the header's Translate button picks a language once and
// applies it to every currently-loaded message, showing the translated text
// alongside (never replacing) the original in each bubble.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/lib/api';
import { hasRole, useMe } from '@/hooks/useMe';
import { accent, colors, fonts } from '@/lib/theme';
import { GradientHeader } from '@/components/GradientHeader';
import { ErrorState, LoadingState } from '@/components/ScreenStates';
import { Avatar } from '../components/Avatar';
import { MessageBubble } from '../components/MessageBubble';
import {
  useConversationDetail,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useTranslateMessage,
} from '../hooks';
import type { TranslateMessageResult } from '../types';
import { findParentContact, primaryTeacherContact, ROLE_LABELS } from '../utils';

const TARGET_LANGUAGES = ['en', 'ta', 'hi', 'te', 'kn', 'ml'];
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
};

export function ConversationScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const me = useMe();
  const isFaculty = hasRole(me.data?.roles, 'FACULTY');

  const detail = useConversationDetail(conversationId);
  const messages = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkConversationRead(conversationId);
  const translate = useTranslateMessage(conversationId);

  const [draft, setDraft] = useState('');
  const [translations, setTranslations] = useState<Record<string, TranslateMessageResult>>({});
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (detail.data) {
      markRead.mutate();
    }
    // Only re-run when the conversation identity changes -- marking read on every
    // background refetch would be wasteful, not incorrect (the endpoint is
    // idempotent), so this narrower dependency is a deliberate choice, not a bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, detail.data?.id]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      await send.mutateAsync(text);
    } catch (err) {
      Alert.alert('Message not sent', err instanceof ApiError ? err.message : 'Please try again.');
      setDraft(text);
    }
  }

  async function handleTranslate(targetLanguage: string) {
    setLanguagePickerOpen(false);
    const items = messages.data?.items ?? [];
    if (items.length === 0) return;
    setTranslating(true);
    try {
      const results = await Promise.all(
        items.map((m) => translate.mutateAsync({ messageId: m.id, targetLanguage }).catch(() => null)),
      );
      const next: Record<string, TranslateMessageResult> = {};
      results.forEach((r) => {
        if (r) next[r.messageId] = r;
      });
      setTranslations(next);
    } catch {
      Alert.alert('Translation unavailable', 'Please try again later.');
    } finally {
      setTranslating(false);
    }
  }

  const teacherContact = useMemo(
    () => primaryTeacherContact(detail.data?.participants ?? []),
    [detail.data?.participants],
  );
  const parentContact = useMemo(() => findParentContact(detail.data?.participants ?? []), [detail.data?.participants]);

  if (detail.isLoading || me.isLoading) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Message" subtitle="Conversation" onBack={() => router.back()} />
        <LoadingState />
      </View>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Message" subtitle="Conversation" onBack={() => router.back()} />
        <ErrorState
          message={detail.error instanceof ApiError ? detail.error.message : 'Unable to load this conversation.'}
          onRetry={() => detail.refetch()}
        />
      </View>
    );
  }

  // Faculty cares which ward/parent this thread is about; Parent cares which
  // teacher they're corresponding with. Never a "+N more" count -- see utils.ts.
  const headerTitle = isFaculty ? detail.data.student.name : (teacherContact?.name ?? 'Conversation');
  const headerSubtitle = isFaculty
    ? `${detail.data.grade.name}-${detail.data.section.name}`
    : teacherContact
      ? ROLE_LABELS[teacherContact.role]
      : '';
  const avatarName = isFaculty ? detail.data.student.name : (teacherContact?.name ?? 'Conversation');
  const items = messages.data?.items ?? [];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => setLanguagePickerOpen(true)} style={styles.translateButton} disabled={translating}>
            <Text style={styles.translateButtonText}>{translating ? 'Translating…' : 'Translate'}</Text>
          </Pressable>
        }
      />

      {isFaculty ? (
        <View style={styles.participantRow}>
          <Avatar name={avatarName} size={28} />
          <Text style={styles.participantNote} numberOfLines={1}>
            {parentContact ? `Parent: ${parentContact.name}` : 'Parent'}
          </Text>
        </View>
      ) : null}

      {messages.isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.sender.personId === me.data?.person.id}
              translatedText={translations[item.id]?.translatedText}
            />
          )}
        />
      )}

      <View style={styles.composerRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a reply"
          placeholderTextColor={colors.textMuted}
          style={styles.composerInput}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={send.isPending || draft.trim().length === 0}
          style={[styles.sendButton, (send.isPending || draft.trim().length === 0) && styles.sendButtonDisabled]}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </View>

      <Modal
        visible={languagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguagePickerOpen(false)}
      >
        <Pressable style={styles.languagePickerBackdrop} onPress={() => setLanguagePickerOpen(false)}>
          <View style={styles.languagePickerSheet}>
            <Text style={styles.languagePickerTitle}>Translate to</Text>
            {TARGET_LANGUAGES.map((code) => (
              <Pressable key={code} onPress={() => handleTranslate(code)} style={styles.languageOption}>
                <Text style={styles.languageOptionText}>{LANGUAGE_LABELS[code] ?? code}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  translateButton: { paddingVertical: 6, paddingHorizontal: 10 },
  translateButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  participantNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, flex: 1 },
  messageList: { padding: 20, flexGrow: 1, justifyContent: 'flex-end' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    backgroundColor: colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  languagePickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  languagePickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  languagePickerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginBottom: 8 },
  languageOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  languageOptionText: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
});
