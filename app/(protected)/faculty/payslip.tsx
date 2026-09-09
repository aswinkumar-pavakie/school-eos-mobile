// Payslip -- gated by its own request (Principal then Finance, same chain
// as HR Payroll). No access yet -> a real request flow with the same
// "approved/rejected by whom" trail every other approval-routed Faculty
// feature shows. Once approved, the real PAID payroll_period/payslip data
// (already read-only, already real) becomes visible.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ApprovalTrail } from '@/components/faculty/ApprovalTrail';
import { ChevronDownIcon, PlusIcon } from '@/components/faculty/icons';
import { getPayslipRequestStatus, requestPayslipAccess, listPayslips, type Payslip } from '@/lib/faculty-payslip-api';
import { formatMoneySummary } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayslipScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const statusQuery = useQuery({ queryKey: ['faculty-payslip-status'], queryFn: getPayslipRequestStatus });
  const hasAccess = statusQuery.data?.hasAccess ?? false;
  const listQuery = useQuery({ queryKey: ['faculty-payslip'], queryFn: listPayslips, enabled: hasAccess });

  async function handleRequest() {
    setRequesting(true);
    try {
      await requestPayslipAccess();
      queryClient.invalidateQueries({ queryKey: ['faculty-payslip-status'] });
    } catch (err) {
      Alert.alert('Could not submit request', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  const items = listQuery.data ?? [];
  const latest = items[0];
  const pendingRequest = statusQuery.data?.requests.find((r) => r.state === 'PENDING');
  const canRequest = !statusQuery.isLoading && !hasAccess && !pendingRequest;

  return (
    <View style={styles.flex}>
      <AppHeader title="Payslip" subtitle={hasAccess && latest ? `${MONTH_NAMES[latest.month - 1]} ${latest.year}` : 'Request access'} onBack={() => router.replace('/erp' as never)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={statusQuery.isFetching} onRefresh={() => statusQuery.refetch()} />}>
        {statusQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : !hasAccess ? (
          <>
            <View style={styles.gateBox}>
              <Text style={styles.gateTitle}>Payslip access required</Text>
              <Text style={styles.gateBody}>Request access to view your payslips. This goes to the Principal, then Finance for approval.</Text>
              {canRequest ? (
                <Pressable style={styles.requestBtn} disabled={requesting} onPress={handleRequest}>
                  {requesting ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <PlusIcon />
                      <Text style={styles.requestBtnText}>Request payslip access</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>

            {(statusQuery.data?.requests ?? []).length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>MY REQUESTS</Text>
                <View style={{ gap: 10 }}>
                  {(statusQuery.data?.requests ?? []).map((r) => (
                    <View key={r.id} style={styles.requestCard}>
                      <View style={styles.requestTop}>
                        <Text style={styles.requestSubject}>{r.subject}</Text>
                        <View
                          style={[
                            styles.stateBadge,
                            r.state === 'APPROVED' && { backgroundColor: facultyColors.greenBg },
                            r.state === 'REJECTED' && { backgroundColor: facultyColors.redBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stateBadgeText,
                              r.state === 'APPROVED' && { color: facultyColors.greenDark },
                              r.state === 'REJECTED' && { color: facultyColors.redDark },
                            ]}
                          >
                            {r.state}
                          </Text>
                        </View>
                      </View>
                      <ApprovalTrail steps={r.approvalTrail} />
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : listQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>Access approved -- no payslips have been processed yet.</Text>
        ) : (
          <>
            {latest ? (
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>NET PAID</Text>
                  <Text style={styles.statValue}>{formatMoneySummary(latest.netPaise)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>PERIOD</Text>
                  <Text style={styles.statValue}>{(MONTH_NAMES[latest.month - 1] ?? '').slice(0, 3)} {latest.year}</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>PAYSLIPS</Text>
            <View style={{ gap: 8 }}>
              {items.map((p) => (
                <PayslipRow key={p.id} payslip={p} open={openId === p.id} onToggle={() => setOpenId((id) => (id === p.id ? null : p.id))} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PayslipRow({ payslip, open, onToggle }: { payslip: Payslip; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.cardTop} onPress={onToggle}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle}>{MONTH_NAMES[payslip.month - 1]} {payslip.year}</Text>
          <Text style={styles.cardMeta}>Gross {formatMoneySummary(payslip.grossPaise)} · Deductions {formatMoneySummary(payslip.deductionsPaise)}</Text>
        </View>
        <Text style={styles.cardNet}>{formatMoneySummary(payslip.netPaise)}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon />
        </View>
      </Pressable>
      {open && payslip.breakdown ? (
        <View style={styles.detail}>
          {Object.entries(payslip.breakdown).map(([key, value]) => (
            <View key={key} style={styles.detailLine}>
              <Text style={styles.detailLabel}>{key.toUpperCase()}</Text>
              <Text style={styles.detailValue}>₹{value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  gateBox: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 18 },
  gateTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  gateBody: { fontSize: 13, color: facultyColors.bodyMuted, lineHeight: 19, marginTop: 8, fontFamily: 'PlusJakartaSans_500Medium' },
  requestBtn: { marginTop: 14, backgroundColor: facultyColors.blue, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  requestBtnText: { color: '#fff', fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  requestCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestSubject: { flex: 1, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  stateBadge: { backgroundColor: facultyColors.amberBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  stateBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.amberDark },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 12 },
  statLabel: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.9 },
  statValue: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, marginTop: 5 },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, overflow: 'hidden' },
  cardTop: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  cardNet: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.greenDark },
  detail: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, backgroundColor: facultyColors.rowBg, padding: 13, gap: 6 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted },
  detailValue: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
});
