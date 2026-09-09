// Search + pick a student to message their family about. The backend fans out
// to every currently ACTIVE guardian at once (confirmed product decision) --
// picking a student with one guardian lands straight in that thread; with more
// than one, there's no single "the" thread to land in, so this goes back to the
// Messages list instead (where every resulting conversation now appears, freshly
// active at the top).

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { Avatar } from '@/features/messaging/components/Avatar';
import { useSearchStudents, useStartStudentConversation } from '@/features/messaging/hooks';

function fullName(firstName: string, lastName: string | null): string {
  return `${firstName} ${lastName ?? ''}`.trim();
}

export default function NewMessageStudentScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const results = useSearchStudents(debounced);
  const start = useStartStudentConversation();

  async function handlePick(studentId: string, studentName: string) {
    try {
      const conversations = await start.mutateAsync(studentId);
      if (conversations.length === 1) {
        router.replace(`/(protected)/my-class/messages/${conversations[0]!.id}` as never);
      } else {
        Alert.alert(
          'Conversation started',
          `Started a conversation with ${studentName}'s ${conversations.length} guardians. You'll find them in your Messages list.`,
        );
        router.back();
      }
    } catch (err) {
      Alert.alert('Could not start conversation', err instanceof ApiError ? err.message : 'Please try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Message a student's family" onBack={() => router.back()} />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by student name"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoFocus
        />
      </View>

      {results.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : results.isError ? (
        <ErrorState
          message={results.error instanceof ApiError ? results.error.message : 'Unable to search students.'}
          onRetry={() => results.refetch()}
        />
      ) : (results.data ?? []).length === 0 ? (
        <EmptyState message={debounced ? 'No students found.' : 'Start typing to search students.'} />
      ) : (
        <FlatList
          data={results.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const name = fullName(item.firstName, item.lastName);
            const isPending = start.isPending && start.variables === item.id;
            return (
              <Pressable
                style={styles.row}
                onPress={() => handlePick(item.id, name)}
                disabled={start.isPending}
              >
                <Avatar name={name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  {item.gradeName ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {item.gradeName}
                      {item.sectionName ? ` - ${item.sectionName}` : ''}
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
