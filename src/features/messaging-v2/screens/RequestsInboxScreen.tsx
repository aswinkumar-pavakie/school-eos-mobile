import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { accent, colors, fonts } from '@/lib/theme';
import { useAcceptRequest, useDeclineRequest, useRequests } from '../hooks';
import { resolveDisplayName } from '../nameCache';
import { Avatar } from '../components/Avatar';

export function RequestsInboxScreen() {
  const router = useRouter();
  const requests = useRequests('PENDING', 'recipient');
  const acceptRequest = useAcceptRequest();
  const declineRequest = useDeclineRequest();

  return (
    <View style={styles.container}>
      <GradientHeader title="Message requests" onBack={() => router.back()} />

      {requests.isLoading ? (
        <LoadingState />
      ) : requests.isError ? (
        <ErrorState message="Couldn't load requests." onRetry={() => requests.refetch()} />
      ) : !requests.data || requests.data.length === 0 ? (
        <EmptyState message="No pending message requests." />
      ) : (
        <FlatList
          data={requests.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const name = resolveDisplayName(item.requesterPersonId);
            const isDeciding =
              (acceptRequest.isPending && acceptRequest.variables === item.id) ||
              (declineRequest.isPending && declineRequest.variables === item.id);
            return (
              <Pressable
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: '/(protected)/messaging/[conversationId]',
                    params: { conversationId: item.conversationId },
                  })
                }
              >
                <Avatar name={name} size={40} />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.subtitle}>Wants to send you a message</Text>
                </View>
                {isDeciding ? (
                  <ActivityIndicator color={accent.blue} size="small" />
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.button, styles.declineButton]}
                      onPress={() => declineRequest.mutate(item.id)}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.button, styles.acceptButton]}
                      onPress={() => acceptRequest.mutate(item.id)}
                    >
                      <Text style={styles.acceptText}>Accept</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1 },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  button: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  declineButton: { borderWidth: 1, borderColor: colors.border },
  declineText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },
  acceptButton: { backgroundColor: accent.blue },
  acceptText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },
});
