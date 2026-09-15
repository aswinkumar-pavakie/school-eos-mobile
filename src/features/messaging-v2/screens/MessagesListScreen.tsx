import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { colors, fonts } from '@/lib/theme';
import { useMe } from '@/hooks/useMe';
import { useConversations, useRequests } from '../hooks';
import { ensureNameCacheHydrated } from '../nameCache';
import { ConversationRow } from '../components/ConversationRow';

export function MessagesListScreen() {
  const router = useRouter();
  const me = useMe();
  const conversations = useConversations();
  const pendingRequests = useRequests('PENDING', 'recipient');

  useEffect(() => {
    ensureNameCacheHydrated();
  }, []);

  const ownPersonId = me.data?.person.id;

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Messages"
        onBack={() => router.back()}
        right={
          <Pressable
            style={styles.newButton}
            onPress={() => router.push('/(protected)/messaging/new')}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={colors.white} />
          </Pressable>
        }
      />

      {pendingRequests.data && pendingRequests.data.length > 0 ? (
        <Pressable
          style={styles.requestsBanner}
          onPress={() => router.push('/(protected)/messaging/requests')}
        >
          <Ionicons name="mail-unread-outline" size={16} color={colors.primary} />
          <Text style={styles.requestsBannerText}>
            {pendingRequests.data.length} message{pendingRequests.data.length === 1 ? '' : 's'} request
            {pendingRequests.data.length === 1 ? '' : 's'} waiting for your response
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      ) : null}

      {conversations.isLoading || me.isLoading || !ownPersonId ? (
        <LoadingState />
      ) : conversations.isError ? (
        <ErrorState
          message="Couldn't load your conversations."
          onRetry={() => conversations.refetch()}
        />
      ) : conversations.data && conversations.data.length > 0 ? (
        <FlatList
          data={conversations.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              ownPersonId={ownPersonId}
              onPress={() =>
                router.push({
                  pathname: '/(protected)/messaging/[conversationId]',
                  params: { conversationId: item.id },
                })
              }
            />
          )}
        />
      ) : (
        <EmptyState message='No conversations yet. Tap the compose icon to start one.' />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestsBannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.text },
});
