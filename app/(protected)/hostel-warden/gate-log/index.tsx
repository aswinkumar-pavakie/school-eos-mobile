// Hostel Warden -> Gate log. Pixel-matched to Warden App.dc.html's own
// `isGateLog` screen (search + state filter + resident register), adapted
// to real data: merges the Warden's own already-scoped Gate Pass and
// Emergency Exit requests into one register, newest-decided first. The
// design's own "Log in/out" action has no real backend equivalent (no
// distinct check-in/check-out event table -- confirmed by direct backend
// audit of outing_request's own state machine), so it's omitted here rather
// than faked; tapping a row instead opens the real, already-built decision
// screen for that request.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, StatusPill, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { listGatePassRequests, listEmergencyExitRequests, type OutingRequestRow } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';

type StatePill = 'All' | 'PENDING' | 'APPROVED' | 'REJECTED';
const STATE_PILLS: StatePill[] = ['All', 'PENDING', 'APPROVED', 'REJECTED'];

export default function GateLogScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<StatePill>('All');

  const gatePassQuery = useQuery({ queryKey: ['hostel-warden', 'gate-pass-requests'], queryFn: listGatePassRequests });
  const emergencyQuery = useQuery({ queryKey: ['hostel-warden', 'emergency-exit-requests'], queryFn: listEmergencyExitRequests });

  const isLoading = gatePassQuery.isLoading || emergencyQuery.isLoading;
  const hasError = gatePassQuery.isError || emergencyQuery.isError;
  const isFetching = gatePassQuery.isFetching || emergencyQuery.isFetching;

  const rows = useMemo(() => {
    const merged: (OutingRequestRow & { kind: 'Gate pass' | 'Emergency exit' })[] = [
      ...(gatePassQuery.data ?? []).map((r) => ({ ...r, kind: 'Gate pass' as const })),
      ...(emergencyQuery.data ?? []).map((r) => ({ ...r, kind: 'Emergency exit' as const })),
    ];
    return merged
      .filter((r) => stateFilter === 'All' || r.state === stateFilter)
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return fullName(r.studentFirstName, r.studentLastName).toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [gatePassQuery.data, emergencyQuery.data, search, stateFilter]);

  function refetchAll() {
    gatePassQuery.refetch();
    emergencyQuery.refetch();
  }

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Gate log" onBack={() => router.back()} />
      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by student name"
          placeholderTextColor={hostelWardenColors.muted}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.pillRow}>
        {STATE_PILLS.map((p) => (
          <Pressable key={p} onPress={() => setStateFilter(p)} style={[styles.pillChip, stateFilter === p && styles.pillChipActive]}>
            <Text style={[styles.pillChipText, stateFilter === p && styles.pillChipTextActive]}>{p === 'All' ? 'All' : p[0] + p.slice(1).toLowerCase()}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetchAll} />}
      >
        {isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState message={gatePassQuery.error instanceof ApiError ? gatePassQuery.error.message : 'Unable to load the gate log.'} onRetry={refetchAll} />
        ) : rows.length === 0 ? (
          <EmptyPanel label="No matching gate activity." />
        ) : (
          rows.map((r) => (
            <Card
              key={r.id}
              style={styles.row}
              onPress={() =>
                router.push(
                  (r.kind === 'Gate pass'
                    ? `/(protected)/hostel-warden/gate-pass-requests/${r.id}`
                    : `/(protected)/hostel-warden/emergency-exit-requests/${r.id}`) as never,
                )
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{fullName(r.studentFirstName, r.studentLastName)}</Text>
                <Text style={styles.rowMeta}>{r.kind} · {new Date(r.requestedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
              </View>
              <StatusPill label={r.state} />
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  searchBox: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: hostelWardenColors.ink, backgroundColor: hostelWardenColors.surface },
  pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  pillChip: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7 },
  pillChipActive: { backgroundColor: hostelWardenColors.primary, borderColor: hostelWardenColors.primary },
  pillChipText: { fontSize: 12, color: hostelWardenColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  pillChipTextActive: { color: '#fff' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: hostelWardenColors.ink },
  rowMeta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
});
