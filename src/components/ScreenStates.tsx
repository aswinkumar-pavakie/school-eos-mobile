import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';

// Shared loading/empty/error placeholders, used by both the online-classes and
// messaging features. Lives here (not inside one feature folder) since features
// never import each other's internals.

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.errorText, textAlign: 'center' },
  retryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
});
