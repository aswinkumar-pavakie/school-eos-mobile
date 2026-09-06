// Parent's "Permissions" list -- every real event permission request across
// every ACTIVE guardian link this parent holds (see ParentPermissionsService
// .list -> StudentEventParticipantRepository.findForGuardian). Shown as cards,
// same convention as Fees/Events.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { formatDate } from '@/lib/format';
import { listPermissionRequests, type PermissionRequestListItem, type PermissionRequestState } from '@/lib/permission-requests-api';
import { parentColors, cardShadow } from '@/lib/theme';

const STATE_LABEL: Record<PermissionRequestState, string> = {
  PENDING: 'Waiting for your decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const STATE_COLOR: Record<PermissionRequestState, { bg: string; text: string }> = {
  PENDING: { bg: parentColors.pillNeutralBg, text: parentColors.ink },
  APPROVED: { bg: '#E7F6EC', text: '#1E7A3E' },
  REJECTED: { bg: '#FDECEA', text: '#B33A2E' },
};

function StatePill({ state }: { state: PermissionRequestState }) {
  const { bg, text } = STATE_COLOR[state];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: text }]}>{STATE_LABEL[state]}</Text>
    </View>
  );
}

export default function PermissionsScreen() {
  const router = useRouter();
  const requestsQuery = useQuery({ queryKey: ['permission-requests'], queryFn: listPermissionRequests });

  return (
    <View style={styles.flex}>
      <AppHeader title="Permissions" subtitle="Event participation requests" onBack={() => router.replace('/my-class')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={requestsQuery.isFetching} onRefresh={() => requestsQuery.refetch()} />}
      >
        {requestsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : (requestsQuery.data ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No permission requests yet.</Text>
        ) : (
          (requestsQuery.data ?? []).map((r: PermissionRequestListItem) => (
            <Pressable key={r.id} style={[styles.card, cardShadow]} onPress={() => router.push(`/permissions/${r.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{r.eventName}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {r.studentName} · Roll {r.rollNo ?? '—'} · {[r.gradeName, r.sectionName].filter(Boolean).join(' ') || 'Class not assigned'}
                </Text>
                <Text style={styles.cardDate} numberOfLines={1}>Requested {formatDate(r.addedAt)}</Text>
                <View style={{ marginTop: 8 }}>
                  <StatePill state={r.state} />
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  cardTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  cardMeta: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 4 },
  cardDate: { fontSize: 12, color: parentColors.mutedLight, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  pill: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 99 },
  pillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
});
