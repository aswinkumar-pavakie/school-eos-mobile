import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { accent, colors, fonts } from '@/lib/theme';
import type { DiscoveryItem } from '@/lib/messaging-api';
import { useDiscoverUsers, useCreateRequest, useStartDirectConversation } from '../hooks';
import { Avatar } from '../components/Avatar';

export function DiscoveryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DiscoveryItem | null>(null);
  const [draft, setDraft] = useState('');

  const discovery = useDiscoverUsers(search);
  const startDirect = useStartDirectConversation();
  const createRequest = useCreateRequest();

  const isSending = startDirect.isPending || createRequest.isPending;
  const sendError = startDirect.error ?? createRequest.error;

  async function handleSend() {
    if (!selected) return;
    const trimmed = draft.trim();
    if (selected.messagingMode === 'REQUEST' && trimmed.length === 0) return;

    const result =
      selected.messagingMode === 'DIRECT'
        ? await startDirect.mutateAsync({
            targetPersonId: selected.userId,
            plaintext: trimmed.length > 0 ? trimmed : undefined,
          })
        : await createRequest.mutateAsync({
            targetPersonId: selected.userId,
            plaintext: trimmed,
          });

    router.replace({
      pathname: '/(protected)/messaging/[conversationId]',
      params: { conversationId: result.conversationId },
    });
  }

  const scoped = discovery.data?.items.filter((item) => item.scope === 'SCOPED') ?? [];
  const unscoped = discovery.data?.items.filter((item) => item.scope === 'UNSCOPED') ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GradientHeader title="New message" onBack={() => router.back()} />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {discovery.isLoading ? (
        <LoadingState />
      ) : discovery.isError ? (
        <ErrorState message="Couldn't load people." onRetry={() => discovery.refetch()} />
      ) : scoped.length === 0 && unscoped.length === 0 ? (
        <EmptyState message="No matches." />
      ) : (
        <FlatList
          data={[
            ...(scoped.length ? [{ header: 'People you can message directly' }] : []),
            ...scoped,
            ...(unscoped.length ? [{ header: 'Other School EOS users' }] : []),
            ...unscoped,
          ]}
          keyExtractor={(item, index) =>
            'header' in item ? `header-${item.header}` : item.userId
          }
          renderItem={({ item }) =>
            'header' in item ? (
              <Text style={styles.sectionHeader}>{item.header}</Text>
            ) : (
              <Pressable style={styles.row} onPress={() => setSelected(item)}>
                <Avatar name={item.displayName} size={40} />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.displayName}</Text>
                  <Text style={styles.role}>
                    {item.role}
                    {item.designation ? ` · ${item.designation}` : ''}
                  </Text>
                </View>
                {item.messagingMode === 'REQUEST' ? (
                  <Text style={styles.requestBadge}>Request</Text>
                ) : null}
              </Pressable>
            )
          }
        />
      )}

      {selected ? (
        <View style={styles.composer}>
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>
              {selected.messagingMode === 'REQUEST'
                ? `Send a message request to ${selected.displayName}`
                : `Message ${selected.displayName}`}
            </Text>
            <Pressable onPress={() => setSelected(null)} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          {sendError ? (
            <Text style={styles.errorText}>{(sendError as Error).message}</Text>
          ) : null}
          <View style={styles.composerRow}>
            <TextInput
              style={styles.composerInput}
              placeholder={
                selected.messagingMode === 'REQUEST'
                  ? 'Write your one message (required)...'
                  : 'Write a message (optional)...'
              }
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable
              style={styles.sendButton}
              onPress={handleSend}
              disabled={isSending || (selected.messagingMode === 'REQUEST' && !draft.trim())}
            >
              {isSending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons name="send" size={18} color={colors.white} />
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  rowText: { flex: 1 },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  role: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  requestBadge: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: accent.blue,
    textTransform: 'uppercase',
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  composerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  composerTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, flex: 1 },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: colors.errorText },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
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
