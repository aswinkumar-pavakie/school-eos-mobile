// Vice Principal -> Finance (Phase 18) -- school-level financial oversight
// ONLY, real backend data only (fee-overview/fee-demands/fee-heads/
// fee-structures/payments, now also authorized for VICE_PRINCIPAL -- see
// vice-principal-finance-api.ts's own comment). Strictly read-only: no
// collect/refund/waive/reconcile/configure actions anywhere in this module --
// those stay Finance-role operational responsibilities, never exposed here.
// Guarded by the parent vice-principal/_layout.tsx.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatMoneyDetail, formatMoneySummary } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listAcademicYears } from '@/lib/vice-principal-academics-api';
import {
  getFeeOverview,
  listFeeDemands,
  listFeeHeads,
  listFeeStructures,
  listPayments,
} from '@/lib/vice-principal-finance-api';
import { listGrades } from '@/lib/vice-principal-students-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

type Tab = 'outstanding' | 'structures' | 'payments';

const DEMAND_STATE_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
  { value: 'WAIVED', label: 'Waived' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function demandStateTone(state: string): StatusTone {
  if (state === 'PAID') return 'positive';
  if (state === 'OVERDUE' || state === 'CANCELLED') return 'negative';
  if (state === 'PARTIAL' || state === 'PENDING') return 'warning';
  return 'neutral';
}

const PAYMENT_STATE_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RECONCILED', label: 'Reconciled' },
  { value: 'REVERSED', label: 'Reversed' },
];

function paymentStateTone(state: string): StatusTone {
  if (state === 'CONFIRMED' || state === 'RECONCILED') return 'positive';
  if (state === 'FAILED' || state === 'REVERSED') return 'negative';
  return 'neutral';
}

function structureStateTone(state: string): StatusTone {
  if (state === 'ACTIVE') return 'positive';
  if (state === 'SUPERSEDED') return 'neutral';
  return 'warning';
}

export default function VicePrincipalFinanceScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('outstanding');
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);

  const yearsQuery = useQuery({ queryKey: ['vp-finance', 'years'], queryFn: listAcademicYears });
  const gradesQuery = useQuery({ queryKey: ['vp-finance', 'grades'], queryFn: listGrades });
  const years = yearsQuery.data ?? [];
  const grades = gradesQuery.data ?? [];
  const currentYear = years.find((y) => y.isCurrent) ?? null;
  const effectiveYearId = academicYearId ?? currentYear?.id;

  const overviewQuery = useQuery({
    queryKey: ['vp-finance', 'overview', effectiveYearId],
    queryFn: () => getFeeOverview(effectiveYearId),
  });
  const overview = overviewQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title="Finance" subtitle="School-wide fee collection overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: 12 }}>
          <SelectField
            label="Academic year"
            value={years.find((y) => y.id === effectiveYearId)?.name ?? null}
            placeholder={yearsQuery.isLoading ? 'Loading…' : 'All years'}
            options={years.map((y) => y.name)}
            onSelect={(name) => setAcademicYearId(years.find((y) => y.name === name)?.id ?? null)}
            disabled={yearsQuery.isLoading}
          />
        </View>

        {overviewQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginBottom: 12 }} />
        ) : overviewQuery.isError ? (
          <ErrorState
            message={overviewQuery.error instanceof ApiError ? overviewQuery.error.message : 'Unable to load the fee overview.'}
            onRetry={() => overviewQuery.refetch()}
          />
        ) : overview ? (
          <>
            <View style={[styles.heroCard, cardShadow]}>
              <Text style={styles.heroLabel}>Total collected</Text>
              <Text style={styles.heroValue}>{formatMoneySummary(overview.totalCollectedPaise)}</Text>
              <Text style={styles.heroSub}>of {formatMoneySummary(overview.totalFeesPaise)} total fees</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{formatMoneySummary(overview.totalPendingPaise)}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={[styles.statValue, styles.statValueWarning]}>{formatMoneySummary(overview.totalOutstandingPaise)}</Text>
                <Text style={styles.statLabel}>Outstanding</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={[styles.statValue, styles.statValueWarning]}>{formatMoneySummary(overview.totalOverduePaise)}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={styles.statValue}>{overview.studentsWithPendingCount}</Text>
                <Text style={styles.statLabel}>Students with pending fees</Text>
              </View>
              <View style={[styles.statTile, cardShadow]}>
                <Text style={[styles.statValue, overview.studentsWithOverdueCount > 0 && styles.statValueWarning]}>
                  {overview.studentsWithOverdueCount}
                </Text>
                <Text style={styles.statLabel}>Students overdue</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <SegmentedTabs<Tab>
        tabs={[
          { key: 'outstanding', label: 'Outstanding' },
          { key: 'structures', label: 'Fee Structures' },
          { key: 'payments', label: 'Payments' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'outstanding' ? (
        <OutstandingFeesTab academicYearId={effectiveYearId} grades={grades} />
      ) : tab === 'structures' ? (
        <FeeStructuresTab academicYearId={effectiveYearId} grades={grades} router={router} />
      ) : (
        <PaymentsTab academicYearId={effectiveYearId} />
      )}
    </View>
  );
}

function OutstandingFeesTab({ academicYearId, grades }: { academicYearId?: string; grades: { id: string; name: string }[] }) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<string | null>(null);
  const [gradeId, setGradeId] = useState<string | null>(null);

  const demandsQuery = useQuery({
    queryKey: ['vp-finance', 'demands', academicYearId, search, state, gradeId],
    queryFn: () =>
      listFeeDemands({
        academicYearId,
        gradeId: gradeId ?? undefined,
        state: state ?? undefined,
        search: search.trim() || undefined,
      }),
  });

  const demands = demandsQuery.data?.data ?? [];
  const total = demandsQuery.data?.meta.total ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by student name or admission no…"
        placeholderTextColor={parentColors.mutedLight}
        style={styles.searchInput}
      />
      <View style={{ marginBottom: 12 }}>
        <SelectField
          label="Grade"
          value={grades.find((g) => g.id === gradeId)?.name ?? null}
          placeholder="Any grade"
          options={grades.map((g) => g.name)}
          onSelect={(name) => setGradeId(grades.find((g) => g.name === name)?.id ?? null)}
        />
      </View>
      <View style={styles.statusRow}>
        {DEMAND_STATE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => setState(opt.value)}
            style={[styles.statusChip, state === opt.value && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, state === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {demandsQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
      ) : demandsQuery.isError ? (
        <ErrorState
          message={demandsQuery.error instanceof ApiError ? demandsQuery.error.message : 'Unable to load outstanding fees.'}
          onRetry={() => demandsQuery.refetch()}
        />
      ) : demands.length === 0 ? (
        <EmptyState message="No fee instalments match your search or filters." />
      ) : (
        <>
          <Text style={styles.resultCount}>
            Showing {demands.length} of {total}
            {total > demands.length ? ' — refine your search to narrow further' : ''}
          </Text>
          <View style={styles.list}>
            {demands.map((demand, index) => (
              <View key={demand.id} style={[styles.demandRow, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {demand.studentFirstName} {demand.studentLastName ?? ''}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {demand.admissionNo}
                    {demand.gradeName ? ` · ${demand.gradeName}${demand.sectionName ? `-${demand.sectionName}` : ''}` : ''}
                    {demand.feeHeadName ? ` · ${demand.feeHeadName}` : ''}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    Due {formatDate(demand.dueDate)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.rowAmount}>{formatMoneyDetail(demand.pendingPaise)}</Text>
                  <StatusBadge label={humanize(demand.state)} tone={demandStateTone(demand.state)} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function FeeStructuresTab({
  academicYearId,
  grades,
  router,
}: {
  academicYearId?: string;
  grades: { id: string; name: string }[];
  router: ReturnType<typeof useRouter>;
}) {
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>('ACTIVE');

  const feeHeadsQuery = useQuery({ queryKey: ['vp-finance', 'fee-heads'], queryFn: listFeeHeads });
  const structuresQuery = useQuery({
    queryKey: ['vp-finance', 'structures', academicYearId, gradeId, state],
    queryFn: () => listFeeStructures({ academicYearId, gradeId: gradeId ?? undefined, state: state ?? undefined }),
  });

  const structures = structuresQuery.data ?? [];
  const feeHeads = feeHeadsQuery.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>Fee heads</Text>
      {feeHeadsQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} />
      ) : feeHeads.length === 0 ? (
        <EmptyState message="No fee heads configured." />
      ) : (
        <View style={[styles.list, { marginBottom: 18 }]}>
          {feeHeads.map((head, index) => (
            <View key={head.id} style={[styles.infoRow, index === 0 && styles.rowFirst]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {head.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {humanize(head.headType)}
                  {head.isRefundable ? ' · Refundable' : ''}
                </Text>
              </View>
              <StatusBadge label={humanize(head.status)} tone={head.status === 'ACTIVE' ? 'positive' : 'neutral'} />
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Structures</Text>
      <View style={{ marginBottom: 12 }}>
        <SelectField
          label="Grade"
          value={grades.find((g) => g.id === gradeId)?.name ?? null}
          placeholder="Any grade"
          options={grades.map((g) => g.name)}
          onSelect={(name) => setGradeId(grades.find((g) => g.name === name)?.id ?? null)}
        />
      </View>
      <View style={styles.statusRow}>
        {[
          { value: null, label: 'All' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'PENDING_APPROVAL', label: 'Pending approval' },
          { value: 'SUPERSEDED', label: 'Superseded' },
        ].map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => setState(opt.value)}
            style={[styles.statusChip, state === opt.value && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, state === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {structuresQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
      ) : structuresQuery.isError ? (
        <ErrorState
          message={structuresQuery.error instanceof ApiError ? structuresQuery.error.message : 'Unable to load fee structures.'}
          onRetry={() => structuresQuery.refetch()}
        />
      ) : structures.length === 0 ? (
        <EmptyState message="No fee structures match your filters." />
      ) : (
        <View style={styles.list}>
          {structures.map((structure, index) => (
            <Pressable
              key={structure.id}
              style={[styles.row, index === 0 && styles.rowFirst]}
              onPress={() => router.push(`/(protected)/vice-principal/finance/structures/${structure.id}` as never)}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {grades.find((g) => g.id === structure.gradeId)?.name ?? 'Unknown grade'}
                  {structure.category ? ` · ${structure.category}` : ''}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {formatMoneyDetail(structure.totalPaise)}
                </Text>
              </View>
              <StatusBadge label={humanize(structure.state)} tone={structureStateTone(structure.state)} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function PaymentsTab({ academicYearId }: { academicYearId?: string }) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<string | null>(null);

  const paymentsQuery = useQuery({
    queryKey: ['vp-finance', 'payments', academicYearId, search, state],
    queryFn: () => listPayments({ academicYearId, state: state ?? undefined, search: search.trim() || undefined }),
  });

  const payments = paymentsQuery.data?.data ?? [];
  const total = paymentsQuery.data?.meta.total ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by student name or receipt no…"
        placeholderTextColor={parentColors.mutedLight}
        style={styles.searchInput}
      />
      <View style={styles.statusRow}>
        {PAYMENT_STATE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => setState(opt.value)}
            style={[styles.statusChip, state === opt.value && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, state === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {paymentsQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
      ) : paymentsQuery.isError ? (
        <ErrorState
          message={paymentsQuery.error instanceof ApiError ? paymentsQuery.error.message : 'Unable to load payments.'}
          onRetry={() => paymentsQuery.refetch()}
        />
      ) : payments.length === 0 ? (
        <EmptyState message="No payments match your search or filters." />
      ) : (
        <>
          <Text style={styles.resultCount}>
            Showing {payments.length} of {total}
            {total > payments.length ? ' — refine your search to narrow further' : ''}
          </Text>
          <View style={styles.list}>
            {payments.map((payment, index) => (
              <View key={payment.id} style={[styles.demandRow, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {payment.studentFirstName ? `${payment.studentFirstName} ${payment.studentLastName ?? ''}` : 'Unlinked payment'}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {payment.admissionNo ?? '—'} · {humanize(payment.mode)}
                    {payment.receiptNo ? ` · Receipt ${payment.receiptNo}` : ''}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatDateTime(payment.confirmedAt ?? payment.initiatedAt)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.rowAmount}>{formatMoneyDetail(payment.amountPaise)}</Text>
                  <StatusBadge label={humanize(payment.state)} tone={paymentStateTone(payment.state)} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 8 },
  tabContent: { paddingHorizontal: 16, paddingBottom: 32 },
  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 10 },
  heroLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  heroValue: { fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 4 },
  heroSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, textAlign: 'center' },
  statValueWarning: { color: '#B77A0A' },
  statLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 6, marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  statusChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  statusChipTextActive: { color: '#fff' },
  resultCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 4, marginBottom: 8 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  demandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  rowAmount: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
});
