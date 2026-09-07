// Search is a client-side filter over the already-fetched conversation list (no new
// backend endpoint -- every conversation already carries the student name and full
// participant list). Parent searches by faculty/class-advisor name (the people they
// might be messaging); Faculty searches by student/ward name (uniformly across
// every authorized conversation, regardless of whether they're the subject teacher
// or class advisor for that section -- the list already contains both, unpartitioned).

import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { hasRole, useMe } from '@/hooks/useMe';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { ConversationRow } from '../components/ConversationRow';
import { useConversations } from '../hooks';
import type { ConversationSummary } from '../types';

export function MessagesListScreen() {
  const router = useRouter();
  const me = useMe();
  const isFaculty = hasRole(me.data?.roles, 'FACULTY');
  const conversations = useConversations();
  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const items = conversations.data ?? [];
    if (!trimmedQuery) return items;
    return items.filter((item) => matchesQuery(item, trimmedQuery, isFaculty));
  }, [conversations.data, trimmedQuery, isFaculty]);

  return (
    <View style={styles.screen}>
      <GradientHeader title="Messages" subtitle="Class conversations" onBack={() => router.back()} />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={isFaculty ? 'Search student' : 'Search faculty or class advisor'}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {conversations.isLoading ? (
        <LoadingState />
      ) : conversations.isError ? (
        <ErrorState
          message={conversations.error instanceof ApiError ? conversations.error.message : 'Unable to load messages.'}
          onRetry={() => conversations.refetch()}
        />
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          onRefresh={() => conversations.refetch()}
          refreshing={conversations.isRefetching}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              isFaculty={isFaculty}
              query={trimmedQuery || undefined}
              onPress={() => router.push(`/(protected)/my-class/messages/${item.id}` as never)}
            />
          )}
        />
      ) : conversations.data && conversations.data.length > 0 ? (
        <EmptyState message="No matches." />
      ) : (
        <EmptyState message="No conversations yet." />
      )}
    </View>
  );
}

function matchesQuery(item: ConversationSummary, query: string, isFaculty: boolean): boolean {
  if (isFaculty) {
    return item.student.name.toLowerCase().includes(query);
  }
  return item.participants.some((p) => p.name.toLowerCase().includes(query));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, padding: 0 },
});
