// Principal -> My OD (On-Duty requests) -- the design's own separate
// "Employee · OD" screen, but there is no separate OD table/endpoint in this
// backend: on-duty is one of the four real StaffLeaveType values
// (CASUAL/MEDICAL/EARNED/ON_DUTY) on the exact same staff_leave_request table
// My Leave already uses (see principal-my-leave-api.ts). This screen is a
// thin, real filter over that same data -- same precedent as the Media Room
// module's own "Staff OD reuses Staff Leave with leaveType ON_DUTY" -- not a
// second parallel feature.

import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { principalColors } from '@/lib/theme';
import { listMyLeaveRequests } from '@/lib/principal-my-leave-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function effectiveState(leave: { state: string; approvalState: string | null }): string {
  return leave.approvalState ?? leave.state;
}

function stateTone(state: string): StatusTone {
  if (state === 'APPROVED') return 'positive';
  if (state === 'REJECTED' || state === 'CANCELLED') return 'negative';
  return 'neutral';
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
}

export default function PrincipalMyODScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['principal-my-leave', 'list'], queryFn: listMyLeaveRequests });

  const odRequests = useMemo(() => (query.data ?? []).filter((r) => r.leaveType === 'ON_DUTY'), [query.data]);

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="On-Duty Requests" subtitle="Your own OD requests" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.applyButton} onPress={() => router.push('/(protected)/principal/my-od/apply' as never)}>
          <Text style={styles.applyButtonText}>+ Apply for OD</Text>
        </Pressable>

        {query.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 16 }} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : 'Unable to load your OD requests.'}
            onRetry={() => query.refetch()}
          />
        ) : odRequests.length === 0 ? (
          <EmptyState message="You have no on-duty requests yet." />
        ) : (
          <View style={styles.list}>
            {odRequests.map((request, index) => {
              const state = effectiveState(request);
              return (
                <Pressable
                  key={request.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/principal/my-leave/${request.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle}>On-duty</Text>
                    <Text style={styles.rowMeta}>
                      {formatDate(request.fromDate)} – {formatDate(request.toDate)} ·{' '}
                      {daysBetween(request.fromDate, request.toDate)} day(s)
                    </Text>
                  </View>
                  <StatusBadge label={humanize(state)} tone={stateTone(state)} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  applyButton: { backgroundColor: principalColors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  applyButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: '#fff' },
  list: { backgroundColor: principalColors.surface, borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: principalColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 2 },
});
