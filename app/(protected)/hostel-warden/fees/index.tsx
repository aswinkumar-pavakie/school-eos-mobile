// Hostel Warden -> Hostel fees. Real per-student fee status via Finance's
// own StudentFeesService, reachable at GET /hostel/students/:id/fees (the
// same real, additive endpoint the website's own Hostel Fees page already
// uses -- room-bed-view.service.ts's getStudentFees). Composes across every
// active room allocation into the hostel-wide fee register the design
// pictures, rather than a bare gap notice for data that, per-student,
// genuinely exists.

import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, StatusPill, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { listRoomAllocations, getStudentFees, type StudentFeeOverallStatus } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { formatMoneySummary } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';

const STATUS_LABEL: Record<StudentFeeOverallStatus, string> = {
  NO_ASSIGNMENT: 'No fee plan',
  PAID: 'Paid',
  PARTIAL: 'Partially paid',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
};

export default function HostelFeesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });
  const active = (allocationsQuery.data ?? []).filter((a) => a.status === 'ACTIVE');

  const feesQuery = useQuery({
    queryKey: ['hostel-warden', 'fees', active.map((a) => a.studentId)],
    queryFn: async () => {
      const results = await Promise.all(
        active.map(async (a) => {
          try {
            const fees = await getStudentFees(a.studentId);
            return { allocation: a, fees };
          } catch {
            return { allocation: a, fees: null };
          }
        }),
      );
      return results.filter((r): r is { allocation: typeof r.allocation; fees: NonNullable<typeof r.fees> } => r.fees !== null);
    },
    enabled: active.length > 0,
  });

  const isLoading = allocationsQuery.isLoading || feesQuery.isLoading;
  const hasError = allocationsQuery.isError || feesQuery.isError;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (feesQuery.data ?? []).filter((r) => {
      if (!q) return true;
      const name = fullName(r.allocation.studentFirstName, r.allocation.studentLastName).toLowerCase();
      return name.includes(q) || r.allocation.roomNo.toLowerCase().includes(q);
    });
  }, [feesQuery.data, search]);

  const totals = useMemo(() => {
    const rows = feesQuery.data ?? [];
    return {
      collected: rows.reduce((sum, r) => sum + Number(r.fees.totalPaidPaise), 0),
      due: rows.reduce((sum, r) => sum + Number(r.fees.totalDuePaise), 0),
      overdue: rows.reduce((sum, r) => sum + Number(r.fees.totalOverduePaise), 0),
      defaulters: rows.filter((r) => r.fees.overallStatus === 'OVERDUE').length,
    };
  }, [feesQuery.data]);

  function refetchAll() {
    allocationsQuery.refetch();
    feesQuery.refetch();
  }

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Hostel fees" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={feesQuery.isFetching} onRefresh={refetchAll} />}
      >
        {isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : hasError ? (
          <ErrorState message={allocationsQuery.error instanceof ApiError ? allocationsQuery.error.message : 'Unable to load hostel fees.'} onRetry={refetchAll} />
        ) : (
          <>
            <View style={styles.statGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Collected</Text>
                <Text style={styles.statValue}>{formatMoneySummary(totals.collected)}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Outstanding</Text>
                <Text style={styles.statValue}>{formatMoneySummary(totals.due)}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Overdue</Text>
                <Text style={styles.statValue}>{formatMoneySummary(totals.overdue)}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Defaulters</Text>
                <Text style={styles.statValue}>{totals.defaulters}</Text>
              </View>
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by student or room"
              placeholderTextColor={hostelWardenColors.muted}
              style={styles.searchInput}
            />

            {filtered.length === 0 ? (
              <EmptyPanel label={search ? 'No students match that search.' : 'No fee records available.'} />
            ) : (
              filtered.map((r) => (
                <Card key={r.allocation.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{fullName(r.allocation.studentFirstName, r.allocation.studentLastName)}</Text>
                    <Text style={styles.rowMeta}>{r.allocation.roomNo} · {r.allocation.blockName}</Text>
                    <Text style={styles.rowAmounts}>
                      Due {formatMoneySummary(Number(r.fees.totalDuePaise))} · Paid {formatMoneySummary(Number(r.fees.totalPaidPaise))}
                    </Text>
                  </View>
                  <StatusPill label={STATUS_LABEL[r.fees.overallStatus]} />
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile: { flexBasis: '47%', flexGrow: 1, backgroundColor: hostelWardenColors.tint, borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 11.5, color: hostelWardenColors.body, fontFamily: 'PlusJakartaSans_600SemiBold' },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.primaryDark, marginTop: 4 },
  searchInput: { borderWidth: 1, borderColor: hostelWardenColors.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: hostelWardenColors.ink, backgroundColor: hostelWardenColors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  rowMeta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
  rowAmounts: { fontSize: 12, color: hostelWardenColors.body, marginTop: 4 },
});
