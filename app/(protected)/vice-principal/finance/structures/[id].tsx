// Vice Principal -> Finance -> Fee Structure detail (Phase 18) -- view-only,
// real backend data only. No create/update/publish/supersede/line actions --
// fee-structures.controller.ts (the AdminFinanceModule one) only ever exposes
// GET routes; the write-capable fee-structures.controller.ts under
// finance/fee-structures/ is a completely separate FINANCE/ADMIN-only
// controller, never granted to VP.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatMoneyDetail } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listAcademicYears } from '@/lib/vice-principal-academics-api';
import { getFeeStructure, listFeeHeads } from '@/lib/vice-principal-finance-api';
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

function structureStateTone(state: string): StatusTone {
  if (state === 'ACTIVE') return 'positive';
  if (state === 'SUPERSEDED') return 'neutral';
  return 'warning';
}

export default function VicePrincipalFeeStructureDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const structureQuery = useQuery({ queryKey: ['vp-finance', 'structure', id], queryFn: () => getFeeStructure(id) });
  const gradesQuery = useQuery({ queryKey: ['vp-finance', 'grades'], queryFn: listGrades });
  const yearsQuery = useQuery({ queryKey: ['vp-finance', 'years'], queryFn: listAcademicYears });
  const feeHeadsQuery = useQuery({ queryKey: ['vp-finance', 'fee-heads'], queryFn: listFeeHeads });

  if (structureQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Fee Structure" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (structureQuery.isError || !structureQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Fee Structure" onBack={() => router.back()} />
        <ErrorState
          message={structureQuery.error instanceof ApiError ? structureQuery.error.message : "Couldn't load this fee structure."}
          onRetry={() => structureQuery.refetch()}
        />
      </View>
    );
  }

  const structure = structureQuery.data;
  const gradeName = gradesQuery.data?.find((g) => g.id === structure.gradeId)?.name ?? 'Unknown grade';
  const yearName = yearsQuery.data?.find((y) => y.id === structure.academicYearId)?.name ?? '—';
  const feeHeadsById = new Map((feeHeadsQuery.data ?? []).map((h) => [h.id, h.name]));

  return (
    <View style={styles.flex}>
      <AppHeader title={gradeName} subtitle={structure.category ?? undefined} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.heroValue}>{formatMoneyDetail(structure.totalPaise)}</Text>
          <StatusBadge label={humanize(structure.state)} tone={structureStateTone(structure.state)} />
        </View>

        <Text style={styles.sectionTitle}>Structure information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Academic year</Text>
            <Text style={styles.infoValue}>{yearName}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Grade</Text>
            <Text style={styles.infoValue}>{gradeName}</Text>
          </View>
          {structure.category ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{structure.category}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Instalments</Text>
        {structure.lines.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.body}>No instalment lines configured.</Text>
          </View>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {structure.lines
              .slice()
              .sort((a, b) => a.instalmentNo - b.instalmentNo)
              .map((line, index) => (
                <View key={line.id} style={[styles.lineRow, index === 0 && styles.rowFirst]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      Instalment {line.instalmentNo} · {feeHeadsById.get(line.feeHeadId) ?? 'Fee head'}
                    </Text>
                    <Text style={styles.rowMeta}>Due {formatDate(line.dueDate)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.infoValue}>{formatMoneyDetail(line.amountPaise)}</Text>
                    {Number(line.lateFeePaise) > 0 ? (
                      <Text style={styles.rowMeta}>+{formatMoneyDetail(line.lateFeePaise)} late fee</Text>
                    ) : null}
                  </View>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  heroValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 20 },
  lineRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
