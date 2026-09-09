// Search + pick a faculty member to start a direct conversation with. Search is
// server-side (GET /messages/principal/faculty/search, debounced client-side) --
// this is a school-wide directory, not a small pre-fetched list like Parent/
// Faculty's own conversation search.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { Avatar } from '@/features/messaging/components/Avatar';
import { useSearchFaculty, useStartFacultyConversation } from '@/features/messaging/hooks';

function fullName(firstName: string, lastName: string | null): string {
  return `${firstName} ${lastName ?? ''}`.trim();
}

export default function NewMessageFacultyScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const results = useSearchFaculty(debounced);
  const start = useStartFacultyConversation();

  async function handlePick(facultyPersonId: string) {
    try {
      const conversation = await start.mutateAsync(facultyPersonId);
      router.replace(`/(protected)/my-class/messages/${conversation.id}` as never);
    } catch (err) {
      Alert.alert('Could not start conversation', err instanceof ApiError ? err.message : 'Please try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Message a faculty member" onBack={() => router.back()} />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoFocus
        />
      </View>

      {results.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : results.isError ? (
        <ErrorState
          message={results.error instanceof ApiError ? results.error.message : 'Unable to search faculty.'}
          onRetry={() => results.refetch()}
        />
      ) : (results.data ?? []).length === 0 ? (
        <EmptyState message={debounced ? 'No faculty found.' : 'Start typing to search faculty.'} />
      ) : (
        <FlatList
          data={results.data}
          keyExtractor={(item) => item.personId}
          renderItem={({ item }) => {
            const name = fullName(item.firstName, item.lastName);
            const isPending = start.isPending && start.variables === item.personId;
            return (
              <Pressable
                style={styles.row}
                onPress={() => handlePick(item.personId)}
                disabled={start.isPending}
              >
                <Avatar name={name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  {item.designation ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {item.designation}
                    </Text>
                  ) : null}
                </View>
                {isPending ? <ActivityIndicator color={colors.primary} size="small" /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
});
