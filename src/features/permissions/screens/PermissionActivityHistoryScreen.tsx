// Faculty "History" detail -- per-student breakdown showing which guardian
// responded (or is still pending), fed by GET /permissions/activities/:id/requests.

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { colors, fonts } from '@/lib/theme';
import { PermissionStatusPill, toneForRequestStatus } from '../components/PermissionStatusPill';
import { usePermissionActivityRequests } from '../hooks';
import type { StudentRequestSummary } from '../types';
import { formatInstantDate } from '../utils';

export function PermissionActivityHistoryScreen({ activityId }: { activityId: string }) {
  const router = useRouter();
  const requests = usePermissionActivityRequests(activityId);

  return (
    <View style={styles.screen}>
      <GradientHeader title="Response history" subtitle="Who has responded" onBack={() => router.back()} />

      {requests.isLoading ? (
        <LoadingState />
      ) : requests.isError ? (
        <ErrorState message="Unable to load responses." onRetry={() => requests.refetch()} />
      ) : (requests.data ?? []).length === 0 ? (
        <EmptyState message="No students on this request." />
      ) : (
        <FlatList
          data={requests.data}
          keyExtractor={(item) => item.requestId}
          renderItem={({ item }) => <StudentRow item={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function StudentRow({ item }: { item: StudentRequestSummary }) {
  const tone = toneForRequestStatus(item.status);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.studentName}>{item.studentName}</Text>
        {item.responderName ? (
          <Text style={styles.responder}>
            {item.status === 'DECLINED' ? 'Declined by' : 'Consented by'} {item.responderName}
            {item.signedAt ? ` · ${formatInstantDate(item.signedAt)}` : ''}
          </Text>
        ) : (
          <Text style={styles.responder}>Awaiting a parent&apos;s response</Text>
        )}
        {item.status === 'DECLINED' && item.declineReason ? (
          <Text style={styles.reason}>&ldquo;{item.declineReason}&rdquo;</Text>
        ) : null}
      </View>
      <PermissionStatusPill tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowLeft: { flex: 1, gap: 2 },
  studentName: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  responder: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  reason: { fontFamily: fonts.regular, fontSize: 12, color: colors.text, fontStyle: 'italic', marginTop: 2 },
});
