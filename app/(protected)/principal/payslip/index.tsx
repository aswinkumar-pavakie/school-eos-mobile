// Principal -> Payslip -- real backend now (faculty-payslip.controller.ts
// broadened 2026-09 to @Roles('FACULTY', 'PRINCIPAL'), confirmed by a real
// live request+withdraw round trip against the running backend -- see
// principal-payslip-api.ts's own comment). Adapted from the Faculty module's
// own real screen (app/(protected)/faculty/payslip.tsx) -- same real gated-
// access flow (Principal then Finance approve access, same disclosed
// self-approval-at-step-1 shape already accepted elsewhere), same real PAID
// payroll_period/payslip data once access is granted.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { ApprovalTrail } from '@/components/faculty/ApprovalTrail';
import { ChevronDownIcon, PlusIcon } from '@/components/principal/icons';
import { getPayslipRequestStatus, requestPayslipAccess, listPayslips, type Payslip } from '@/lib/principal-payslip-api';
import { formatMoneySummary } from '@/lib/format';
import { principalColors } from '@/lib/theme';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PrincipalPayslipScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const statusQuery = useQuery({ queryKey: ['principal-payslip-status'], queryFn: getPayslipRequestStatus });
  const hasAccess = statusQuery.data?.hasAccess ?? false;
  const listQuery = useQuery({ queryKey: ['principal-payslip'], queryFn: listPayslips, enabled: hasAccess });

  async function handleRequest() {
    setRequesting(true);
    try {
      await requestPayslipAccess();
      queryClient.invalidateQueries({ queryKey: ['principal-payslip-status'] });
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
      <PrincipalHeader title="Payslip" subtitle={hasAccess && latest ? `${MONTH_NAMES[latest.month - 1]} ${latest.year}` : 'Request access'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={statusQuery.isFetching} onRefresh={() => statusQuery.refetch()} />}>
        {statusQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 24 }} />
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
                            r.state === 'APPROVED' && { backgroundColor: principalColors.greenBg },
                            r.state === 'REJECTED' && { backgroundColor: principalColors.redBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stateBadgeText,
                              r.state === 'APPROVED' && { color: principalColors.green },
                              r.state === 'REJECTED' && { color: principalColors.red },
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
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 24 }} />
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
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: principalColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  gateBox: { backgroundColor: principalColors.surface, borderWidth: 1, borderColor: principalColors.border, borderRadius: 16, padding: 18 },
  gateTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  gateBody: { fontSize: 13, color: principalColors.body, lineHeight: 19, marginTop: 8, fontFamily: 'PlusJakartaSans_500Medium' },
  requestBtn: { marginTop: 14, backgroundColor: principalColors.primary, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  requestBtnText: { color: '#fff', fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  requestCard: { backgroundColor: principalColors.surface, borderWidth: 1, borderColor: principalColors.border, borderRadius: 14, padding: 13 },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestSubject: { flex: 1, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  stateBadge: { backgroundColor: principalColors.tint6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  stateBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.primaryDark },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: principalColors.surface, borderWidth: 1, borderColor: principalColors.border, borderRadius: 14, padding: 12 },
  statLabel: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.muted, letterSpacing: 0.9 },
  statValue: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 5 },
  card: { backgroundColor: principalColors.surface, borderWidth: 1, borderColor: principalColors.border, borderRadius: 14, overflow: 'hidden' },
  cardTop: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  cardMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 3 },
  cardNet: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.green },
  detail: { borderTopWidth: 1, borderTopColor: principalColors.borderSoft, backgroundColor: principalColors.tint3, padding: 13, gap: 6 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.muted },
  detailValue: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
});
