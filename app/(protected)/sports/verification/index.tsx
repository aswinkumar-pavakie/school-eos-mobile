// Sports Admin -> Result Verification. Real listResultEntries('PENDING')/
// updateResultEntry() -- same sports_result_entry table Entry Results
// writes to (see results/index.tsx's own header comment and migration
// 0026_sports_practice_results_selection_substitute.sql), filtered to the
// PENDING queue with a verify/reject action -- a genuine backend gap
// confirmed by audit and built new for this feature.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader } from '@/components/sports/primitives';
import { listResultEntries, updateResultEntry } from '@/lib/sports-api';
import { ApiError } from '@/lib/api';

export default function ResultVerificationScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const pendingQuery = useQuery({ queryKey: ['sports-result-entries', 'PENDING'], queryFn: () => listResultEntries('PENDING') });

  const decideMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'VERIFIED' | 'REJECTED' }) => updateResultEntry(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-result-entries'] }),
  });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Result verification" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={pendingQuery.isFetching} onRefresh={() => pendingQuery.refetch()} />}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Pending verification</Text>
          <Text style={styles.count}>{pendingQuery.data?.length ?? 0} entr{(pendingQuery.data?.length ?? 0) === 1 ? 'y' : 'ies'}</Text>
        </View>
        {pendingQuery.isLoading ? (
          <ActivityIndicator color={sportsColors.primary} style={{ marginTop: 24 }} />
        ) : pendingQuery.isError ? (
          <Text style={styles.error}>{pendingQuery.error instanceof ApiError ? pendingQuery.error.message : 'Unable to load results.'}</Text>
        ) : (pendingQuery.data ?? []).length === 0 ? (
          <EmptyPanel label="Nothing waiting on verification." />
        ) : (
          (pendingQuery.data ?? []).map((r) => (
            <Card key={r.id} style={styles.rowCard}>
              <View style={{ gap: 3 }}>
                <Text style={styles.rowTitle}>{r.studentFirstName} {r.studentLastName ?? ''}</Text>
                <Text style={styles.rowSub}>{r.sportName} · {r.eventName}</Text>
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Result</Text>
                  <Text style={styles.metaValue}>{r.resultValue}{r.position ? ` · ${r.position}` : ''}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable
                  disabled={decideMutation.isPending}
                  style={styles.verifyButton}
                  onPress={() => decideMutation.mutate({ id: r.id, status: 'VERIFIED' })}
                >
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </Pressable>
                <Pressable
                  disabled={decideMutation.isPending}
                  style={styles.rejectButton}
                  onPress={() => decideMutation.mutate({ id: r.id, status: 'REJECTED' })}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingTop: 2 },
  title: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  count: { fontSize: 11.5, color: sportsColors.tertiary },
  error: { fontSize: 12.5, color: sportsColors.red, textAlign: 'center', marginTop: 24 },
  rowCard: { gap: 12, padding: 16 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, lineHeight: 19 },
  rowSub: { fontSize: 12.5, color: sportsColors.mutedStrong },
  metaBlock: { gap: 7, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, paddingTop: 11 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaKey: { flex: 1, fontSize: 12, color: sportsColors.tertiary },
  metaValue: { flex: 1.2, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong, textAlign: 'right' },
  verifyButton: { flex: 1, backgroundColor: sportsColors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  verifyButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  rejectButton: { flex: 1, borderWidth: 1, borderColor: sportsColors.red, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.red },
});
