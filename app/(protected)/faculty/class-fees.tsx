// Class Teacher (Advisor) Fees -- which of this advisor's students currently
// owe fees, real data via faculty-fees.controller.ts (already scoped to
// "class you are the class advisor of" server-side). Read-only -- payment
// itself stays Parent-only (see /fees). Pixel-matches this app's own
// established Faculty screen pattern (header, ClassSwitcher, StatCards,
// expandable row cards -- same as class-results.tsx).

import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { StatCards } from '@/components/faculty/StatCards';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { classHubHref } from '@/lib/nav';
import { listAdvisorSections } from '@/lib/faculty-scope-api';
import { getSectionFees, type SectionFeeRow } from '@/lib/faculty-fees-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ClassFeesScreen() {
  const router = useRouter();
  const { isClassTeacherLogin } = useCurrentRoles();
  const [sectionOverride, setSectionOverride] = useState<string | null>(null);

  const sectionsQuery = useQuery({ queryKey: ['faculty-advisor-sections'], queryFn: listAdvisorSections });
  const sectionKey = sectionOverride ?? sectionsQuery.data?.[0]?.sectionId ?? null;
  const options = useMemo(
    () => (sectionsQuery.data ?? []).map((s) => ({ key: s.sectionId, label: `${s.gradeName} - ${s.sectionName}` })),
    [sectionsQuery.data],
  );

  const feesQuery = useQuery({
    queryKey: ['faculty-class-fees', sectionKey],
    queryFn: () => getSectionFees(sectionKey!),
    enabled: !!sectionKey,
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="Fees" subtitle={options.find((o) => o.key === sectionKey)?.label ?? ''} onBack={() => router.replace(classHubHref(isClassTeacherLogin) as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={feesQuery.isFetching} onRefresh={() => feesQuery.refetch()} />}
      >
        {sectionsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : options.length === 0 ? (
          <Text style={styles.emptyText}>You are not the class advisor for any section.</Text>
        ) : (
          <>
            {/* Same reasoning as class-teacher.tsx / class-results.tsx: a
                Class Teacher login is always exactly one section, so a
                switcher has nothing to switch between for that identity. */}
            {!isClassTeacherLogin ? (
              <ClassSwitcher options={options} selectedKey={sectionKey} onSelect={setSectionOverride} />
            ) : null}

            {feesQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : feesQuery.data ? (
              <>
                <StatCards
                  items={[
                    { label: 'OVERDUE', value: String(feesQuery.data.overdueCount) },
                    { label: 'DUE', value: String(feesQuery.data.dueCount) },
                    { label: 'PAID', value: String(feesQuery.data.paidCount) },
                  ]}
                />

                {feesQuery.data.rows.length === 0 ? (
                  <Text style={styles.emptyText}>No pending fees for this class.</Text>
                ) : (
                  <>
                    <Text style={styles.sectionLabel}>STUDENTS WITH DUES ({feesQuery.data.studentsWithDues})</Text>
                    <View style={{ gap: 8 }}>
                      {feesQuery.data.rows.map((row) => (
                        <FeeRow key={row.studentId} row={row} />
                      ))}
                    </View>
                  </>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FeeRow({ row }: { row: SectionFeeRow }) {
  const overdue = row.status === 'OVERDUE';
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle}>{row.studentName}{row.rollNo !== null ? ` · Roll ${row.rollNo}` : ''}</Text>
          <Text style={styles.rowMeta}>{row.term} · Due {formatDate(row.dueDate)}</Text>
          {row.parentName ? <Text style={styles.rowMeta}>{row.parentName}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.amount}>{formatRupees(row.amountPending)}</Text>
          <View style={[styles.statusBadge, overdue ? styles.statusBadgeOverdue : styles.statusBadgeDue]}>
            <Text style={[styles.statusBadgeText, overdue ? styles.statusBadgeTextOverdue : styles.statusBadgeTextDue]}>
              {overdue ? 'OVERDUE' : 'DUE'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  rowCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, overflow: 'hidden' },
  rowTop: { padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  amount: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
  statusBadgeOverdue: { backgroundColor: '#FDE8E8' },
  statusBadgeDue: { backgroundColor: '#FEF3C7' },
  statusBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.4 },
  statusBadgeTextOverdue: { color: '#B91C1C' },
  statusBadgeTextDue: { color: '#92400E' },
});
