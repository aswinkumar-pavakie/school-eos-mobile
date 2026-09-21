// Hostel Warden -> Gate tab. Pixel-matched to Warden App.dc.html's own
// `isGate` dashboard ("Out of the hostel now" / "Returns due back" lists).
// The real backend has no separate gate-event log (no distinct check-in/
// check-out table) -- "out now" vs "due back" is inferred from each already
// warden-scoped Gate Pass / Emergency Exit request's own outFrom/
// expectedReturn against the current time, the same real substitute the
// Admin/Principal web oversight screen already uses server-side
// (outing-request.repository.ts's own findActiveOversight), computed here
// client-side over the Warden's own already-scoped list calls instead of a
// new endpoint -- keeps this screen strictly to this Warden's own hostel(s),
// never school-wide.

import { useMemo } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { HostelIcon } from '@/components/hostel-warden/icons';
import { listGatePassRequests, listEmergencyExitRequests, listStudentGuardians, type OutingRequestRow } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';

function GateRow({ row, dueBack }: { row: OutingRequestRow; dueBack: boolean }) {
  return (
    <Card style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{fullName(row.studentFirstName, row.studentLastName)}</Text>
        <Text style={styles.rowMeta}>{row.destination ?? row.reason}</Text>
      </View>
      <Text style={[styles.rowTime, dueBack && styles.rowTimeDue]}>
        {new Date(row.expectedReturn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </Text>
      <Pressable onPress={() => callGuardianOf(row.studentId)} style={styles.callButton} hitSlop={6}>
        <HostelIcon name="staff" color={hostelWardenColors.primary} size={16} strokeWidth={2} />
      </Pressable>
    </Card>
  );
}

export default function GateScreen() {
  const router = useRouter();
  const gatePassQuery = useQuery({ queryKey: ['hostel-warden', 'gate-pass-requests'], queryFn: listGatePassRequests });
  const emergencyQuery = useQuery({ queryKey: ['hostel-warden', 'emergency-exit-requests'], queryFn: listEmergencyExitRequests });

  const isLoading = gatePassQuery.isLoading || emergencyQuery.isLoading;
  const hasError = gatePassQuery.isError || emergencyQuery.isError;
  const isFetching = gatePassQuery.isFetching || emergencyQuery.isFetching;

  const { outNow, dueBack } = useMemo(() => {
    const now = Date.now();
    const all = [...(gatePassQuery.data ?? []), ...(emergencyQuery.data ?? [])].filter(
      (r) => r.state === 'APPROVED' && new Date(r.outFrom).getTime() <= now,
    );
    return {
      outNow: all.filter((r) => new Date(r.expectedReturn).getTime() > now).sort((a, b) => new Date(a.expectedReturn).getTime() - new Date(b.expectedReturn).getTime()),
      dueBack: all.filter((r) => new Date(r.expectedReturn).getTime() <= now).sort((a, b) => new Date(a.expectedReturn).getTime() - new Date(b.expectedReturn).getTime()),
    };
  }, [gatePassQuery.data, emergencyQuery.data]);

  function refetchAll() {
    gatePassQuery.refetch();
    emergencyQuery.refetch();
  }

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="My Gate" onBack={() => router.replace('/')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetchAll} />}
      >
        {isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState
            message={gatePassQuery.error instanceof ApiError ? gatePassQuery.error.message : 'Unable to load gate activity.'}
            onRetry={refetchAll}
          />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <HostelIcon name="gatelogOut" color={hostelWardenColors.primary} size={18} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Out of the hostel now</Text>
            </View>
            {outNow.length === 0 ? (
              <EmptyPanel label="No students are currently out." />
            ) : (
              outNow.map((r) => <GateRow key={r.id} row={r} dueBack={false} />)
            )}

            <View style={styles.sectionHeader}>
              <HostelIcon name="gatelogIn" color={hostelWardenColors.red} size={18} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Returns due back</Text>
            </View>
            {dueBack.length === 0 ? (
              <EmptyPanel label="No overdue returns." />
            ) : (
              dueBack.map((r) => <GateRow key={r.id} row={r} dueBack />)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function callGuardianOf(studentId: string) {
  return listStudentGuardians(studentId).then((guardians) => {
    const phone = guardians[0]?.mobile;
    if (phone) Linking.openURL(`tel:${phone}`);
  });
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: hostelWardenColors.ink },
  rowMeta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
  rowTime: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.primary },
  rowTimeDue: { color: hostelWardenColors.red },
  callButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: hostelWardenColors.tint, alignItems: 'center', justifyContent: 'center' },
});
