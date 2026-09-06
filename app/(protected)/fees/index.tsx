// Pixel replica of the design reference's isFees block (Term selector, Total/Paid/
// Outstanding summary, Pay fees / Payment history segmented tabs, per-line
// checkboxes + status, "Paying now" + Pay now) -- wired end to end to the real
// backend (school-eos-backend's src/modules/parent), with Razorpay's real hosted
// checkout for the actual charge. No third code path ever marks a payment paid on
// this screen: after checkout closes, the screen just re-fetches the real state
// from the server (which only the Razorpay webhook can have actually changed).

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { RazorpayCheckout, type RazorpayOrderInfo } from '@/components/RazorpayCheckout';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { formatDate, formatMoneySummary } from '@/lib/format';
import { authedRequest } from '@/lib/auth';
import {
  createRazorpayOrder,
  getFeeSummary,
  getReceipt,
  listFeeTerms,
  listPayments,
  type FeeLine,
  type FeeTerm,
  type PaymentHistoryItem,
} from '@/lib/parent-api';
import { printReceipt } from '@/lib/receipt-print';
import { parentColors, cardShadow } from '@/lib/theme';

const MODE_LABELS: Record<string, string> = {
  UPI: 'UPI',
  CARD: 'Card',
  NETBANKING: 'Net Banking',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  DD: 'Demand Draft',
  WALLET_TOPUP: 'Wallet Top-up',
};

function ChevronDown() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={parentColors.muted} strokeWidth={2}>
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

function EditIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={parentColors.blueDeep} strokeWidth={2}>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

function CheckIcon({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3}>
      <Path d="M5 12l5 5L19 7" />
    </Svg>
  );
}

function StatusPill({ label, paid }: { label: string; paid: boolean }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: paid ? parentColors.pillBlueBg : parentColors.pillNeutralBg }]}>
      <Text style={[styles.statusPillText, { color: paid ? parentColors.blueDeep : parentColors.ink }]}>{label}</Text>
    </View>
  );
}

function Checkbox({ checked, done, onPress }: { checked: boolean; done: boolean; onPress: () => void }) {
  if (done) {
    return (
      <View style={styles.doneCircle}>
        <CheckIcon color={parentColors.blueDeep} />
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={[styles.checkbox, checked ? styles.checkboxOn : styles.checkboxOff]}
      hitSlop={6}
    >
      {checked ? <CheckIcon /> : null}
    </Pressable>
  );
}

export default function FeesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;

  const [tab, setTab] = useState<'pay' | 'history'>('pay');
  const [termMenuOpen, setTermMenuOpen] = useState(false);
  // null = "no explicit choice yet" -- the actual selected term is derived below,
  // defaulting to the most recent real term once the list loads. Deriving during
  // render (rather than an effect + setState) avoids a redundant extra render and
  // can never show a stale default.
  const [chosenTermKey, setChosenTermKey] = useState<string | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [selectionAppliedForTermKey, setSelectionAppliedForTermKey] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<RazorpayOrderInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const termsQuery = useQuery({
    queryKey: ['fee-terms', studentId],
    queryFn: () => listFeeTerms(studentId!),
    enabled: !!studentId,
  });

  const terms = termsQuery.data;
  const selectedTerm = useMemo<FeeTerm | null>(() => {
    const list = terms ?? [];
    if (chosenTermKey) {
      const found = list.find((t) => `${t.academicYearId}|${t.instalmentNo}` === chosenTermKey);
      if (found) return found;
    }
    return list.length > 0 ? list[list.length - 1]! : null;
  }, [terms, chosenTermKey]);
  const selectedTermKey = selectedTerm ? `${selectedTerm.academicYearId}|${selectedTerm.instalmentNo}` : null;

  const summaryQuery = useQuery({
    queryKey: ['fee-summary', studentId, selectedTerm?.academicYearId, selectedTerm?.instalmentNo],
    queryFn: () => getFeeSummary(studentId!, selectedTerm!.academicYearId, selectedTerm!.instalmentNo),
    enabled: !!studentId && !!selectedTerm,
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments', studentId],
    queryFn: () => listPayments(studentId!),
    enabled: !!studentId,
  });

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => authedRequest<{ data: { person: { firstName: string; lastName: string | null; email: string | null } } }>('/auth/me'),
  });

  const lines = useMemo(() => summaryQuery.data?.lines ?? [], [summaryQuery.data]);

  // Pre-select the first payable line, same single-preselection the design
  // reference itself shows -- applied once per term, the moment that term's real
  // data has actually arrived (never against another term's stale lines). This is
  // React's documented "adjust state during rendering" pattern, not a `useEffect`:
  // it converges in the same render (selectionAppliedForTermKey is set to match),
  // so there's no cascading re-render.
  if (selectedTermKey && summaryQuery.data && selectionAppliedForTermKey !== selectedTermKey) {
    setSelectionAppliedForTermKey(selectedTermKey);
    const firstPayable = lines.find((l) => l.state !== 'PAID' && l.state !== 'WAIVED' && l.state !== 'CANCELLED');
    setSelectedLineIds(firstPayable ? new Set([firstPayable.feeDemandId]) : new Set());
    setAmountOverride(null);
  }

  const selectedOutstandingPaise = useMemo(() => {
    return lines
      .filter((l) => selectedLineIds.has(l.feeDemandId))
      .reduce((sum, l) => sum + BigInt(l.outstandingPaise), 0n);
  }, [lines, selectedLineIds]);

  const defaultAmountRupees = (Number(selectedOutstandingPaise) / 100).toString();
  const amountRupees = amountOverride ?? defaultAmountRupees;
  const amountPaise = Math.round((Number(amountRupees) || 0) * 100);
  const canPay = summaryQuery.data?.canPay ?? false;
  const amountValid = amountPaise > 0 && BigInt(amountPaise) <= selectedOutstandingPaise;

  function toggleLine(feeDemandId: string) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(feeDemandId)) next.delete(feeDemandId);
      else next.add(feeDemandId);
      return next;
    });
    setAmountOverride(null);
  }

  async function handlePayNow() {
    if (!studentId || !selectedTerm || !amountValid || submitting) return;
    setSubmitting(true);
    try {
      const order = await createRazorpayOrder(studentId, {
        academicYearId: selectedTerm.academicYearId,
        instalmentNo: selectedTerm.instalmentNo,
        feeDemandIds: Array.from(selectedLineIds),
        amountPaise: String(amountPaise),
      });
      setCheckoutOrder(order);
    } catch (err) {
      Alert.alert('Could not start payment', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function refetchAfterCheckout() {
    queryClient.invalidateQueries({ queryKey: ['fee-summary'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  }

  async function handleDownloadReceipt(receiptId: string) {
    setDownloadingReceiptId(receiptId);
    try {
      const detail = await getReceipt(receiptId);
      await printReceipt(detail);
    } catch (err) {
      Alert.alert('Could not open receipt', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDownloadingReceiptId(null);
    }
  }

  const refreshing = summaryQuery.isFetching || paymentsQuery.isFetching || termsQuery.isFetching;
  function onRefresh() {
    termsQuery.refetch();
    summaryQuery.refetch();
    paymentsQuery.refetch();
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Pay fees" subtitle={selectedTerm?.label} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.fieldLabel}>Term</Text>
          <Pressable style={styles.termSelect} onPress={() => setTermMenuOpen((v) => !v)}>
            <Text style={styles.termSelectText} numberOfLines={1}>
              {selectedTerm?.label ?? (termsQuery.isLoading ? 'Loading…' : 'Select a term')}
            </Text>
            <ChevronDown />
          </Pressable>
          {termMenuOpen ? (
            <View style={styles.termMenu}>
              {(termsQuery.data ?? []).map((term) => {
                const active = selectedTerm?.academicYearId === term.academicYearId && selectedTerm?.instalmentNo === term.instalmentNo;
                return (
                  <Pressable
                    key={`${term.academicYearId}-${term.instalmentNo}`}
                    style={[styles.termOption, active && styles.termOptionActive]}
                    onPress={() => {
                      setChosenTermKey(`${term.academicYearId}|${term.instalmentNo}`);
                      setTermMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.termOptionText, active && styles.termOptionTextActive]}>{term.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryValue}>{formatMoneySummary(summaryQuery.data?.totalPayablePaise ?? '0')}</Text>
              <Text style={styles.summaryLabel}>Total payable</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.summaryValue, { color: parentColors.blueDeep }]}>{formatMoneySummary(summaryQuery.data?.paidPaise ?? '0')}</Text>
              <Text style={styles.summaryLabel}>Paid</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryValue}>{formatMoneySummary(summaryQuery.data?.outstandingPaise ?? '0')}</Text>
              <Text style={styles.summaryLabel}>Outstanding</Text>
            </View>
          </View>
        </View>

        <View style={styles.segment}>
          <Pressable style={[styles.segmentBtn, tab === 'pay' && styles.segmentBtnActive]} onPress={() => setTab('pay')}>
            <Text style={[styles.segmentText, tab === 'pay' && styles.segmentTextActive]}>Pay fees</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, tab === 'history' && styles.segmentBtnActive]} onPress={() => setTab('history')}>
            <Text style={[styles.segmentText, tab === 'history' && styles.segmentTextActive]}>Payment history</Text>
          </Pressable>
        </View>

        {tab === 'history' ? (
          <PaymentHistoryList
            payments={paymentsQuery.data ?? []}
            loading={paymentsQuery.isLoading}
            downloadingReceiptId={downloadingReceiptId}
            onDownload={handleDownloadReceipt}
          />
        ) : summaryQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <View style={{ gap: 14 }}>
            {lines.map((line) => (
              <FeeLineCard key={line.feeDemandId} line={line} checked={selectedLineIds.has(line.feeDemandId)} onToggle={() => toggleLine(line.feeDemandId)} />
            ))}

            {summaryQuery.data && summaryQuery.data.outstandingPaise === '0' ? (
              <View style={styles.allPaidBanner}>
                <CheckIcon color={parentColors.blueDeep} />
                <Text style={styles.allPaidText}>All fees paid for this term</Text>
              </View>
            ) : summaryQuery.data ? (
              <View style={[styles.card, cardShadow, styles.payFooter]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Paying now</Text>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountPrefix}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      value={amountRupees}
                      onChangeText={setAmountOverride}
                      editable={canPay && selectedLineIds.size > 0}
                      selectTextOnFocus
                    />
                    <EditIcon />
                  </View>
                  {canPay && selectedLineIds.size > 0 ? (
                    <Text style={styles.amountHint}>Tap the amount to pay less than the full due now</Text>
                  ) : null}
                  {!amountValid && selectedLineIds.size > 0 ? (
                    <Text style={styles.amountError}>Enter an amount up to {formatMoneySummary(selectedOutstandingPaise.toString())}</Text>
                  ) : null}
                  {!canPay ? <Text style={styles.amountError}>View-only access — the primary guardian can pay this fee.</Text> : null}
                </View>
                <Pressable
                  disabled={!amountValid || !canPay || submitting}
                  onPress={handlePayNow}
                  style={[styles.payButton, (!amountValid || !canPay || submitting) && styles.payButtonDisabled]}
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay now</Text>}
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <RazorpayCheckout
        visible={!!checkoutOrder}
        order={checkoutOrder}
        prefill={{
          name: meQuery.data ? [meQuery.data.data.person.firstName, meQuery.data.data.person.lastName].filter(Boolean).join(' ') : undefined,
          email: meQuery.data?.data.person.email ?? undefined,
        }}
        onRequestClose={() => {
          setCheckoutOrder(null);
          refetchAfterCheckout();
        }}
        onResult={(result) => {
          setCheckoutOrder(null);
          refetchAfterCheckout();
          if (result.type === 'success') {
            Alert.alert('Payment submitted', 'Your payment is being confirmed by the bank — it will appear in Payment history shortly.');
          } else if (result.type === 'failed') {
            Alert.alert('Payment failed', result.message ?? 'Please try again.');
          }
        }}
      />
    </View>
  );
}

function FeeLineCard({ line, checked, onToggle }: { line: FeeLine; checked: boolean; onToggle: () => void }) {
  const done = line.state === 'PAID';
  const interactive = !done && line.state !== 'WAIVED' && line.state !== 'CANCELLED';
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.lineTop}>
        {interactive ? <Checkbox checked={checked} done={false} onPress={onToggle} /> : done ? <Checkbox checked={false} done onPress={() => {}} /> : <View style={{ width: 22 }} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.lineTitle}>{line.feeHeadName}</Text>
          <Text style={styles.lineDue}>Due {formatDate(line.dueDate)}</Text>
        </View>
        <StatusPill label={done ? 'Paid' : line.state === 'PARTIAL' ? 'Partial' : line.state === 'OVERDUE' ? 'Overdue' : 'Pending'} paid={done} />
      </View>
      {interactive || line.paidPaise !== '0' ? (
        <View style={styles.lineGrid}>
          <View>
            <Text style={styles.lineGridLabel}>TOTAL</Text>
            <Text style={styles.lineGridValue}>{formatMoneySummary(String(BigInt(line.amountPaise) + BigInt(line.lateFeePaise)))}</Text>
          </View>
          <View style={styles.lineGridPaid}>
            <Text style={styles.lineGridLabel}>PAID</Text>
            <Text style={styles.lineGridValue}>{formatMoneySummary(line.paidPaise)}</Text>
          </View>
          <View style={styles.lineGridDue}>
            <Text style={[styles.lineGridLabel, { color: '#8DA6E4' }]}>DUE</Text>
            <Text style={[styles.lineGridValue, { color: parentColors.blueDeep }]}>{formatMoneySummary(line.outstandingPaise)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PaymentHistoryList({
  payments,
  loading,
  downloadingReceiptId,
  onDownload,
}: {
  payments: PaymentHistoryItem[];
  loading: boolean;
  downloadingReceiptId: string | null;
  onDownload: (receiptId: string) => void;
}) {
  if (loading) return <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />;
  if (payments.length === 0) {
    return <Text style={styles.emptyText}>No payments recorded yet.</Text>;
  }
  return (
    <View style={[styles.card, cardShadow, { paddingHorizontal: 0, paddingVertical: 0 }]}>
      {payments.map((p, i) => (
        <View key={p.id} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lineTitle}>{MODE_LABELS[p.mode] ?? p.mode}</Text>
            <Text style={styles.lineDue}>Paid {formatDate(p.confirmedAt ?? p.initiatedAt)}</Text>
            <Text style={styles.historyRef}>{p.receiptNo ? `Receipt ${p.receiptNo}` : 'Receipt not yet issued'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 9 }}>
            <Text style={styles.historyAmount}>{formatMoneySummary(p.amountPaise)}</Text>
            {p.receiptId ? (
              <Pressable style={styles.downloadBtn} onPress={() => onDownload(p.receiptId!)} disabled={downloadingReceiptId === p.receiptId}>
                <Text style={styles.downloadBtnText}>{downloadingReceiptId === p.receiptId ? 'Preparing…' : 'Download receipt'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  fieldLabel: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold' },
  termSelect: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  termSelectText: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, flex: 1, marginRight: 8 },
  termMenu: { borderWidth: 1, borderColor: parentColors.fieldBorder, borderRadius: 12, marginTop: 8, overflow: 'hidden' },
  termOption: { padding: 13, borderBottomWidth: 1, borderBottomColor: parentColors.borderSoft },
  termOptionActive: { backgroundColor: '#F5F8FE' },
  termOptionText: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#41526E' },
  termOptionTextActive: { color: parentColors.blueDeep, fontFamily: 'PlusJakartaSans_700Bold' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
    marginTop: 16,
    paddingTop: 16,
  },
  summaryValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  summaryLabel: { fontSize: 12, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  segment: { flexDirection: 'row', backgroundColor: parentColors.segmentTrack, borderRadius: 14, padding: 5 },
  segmentBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 11 },
  segmentBtnActive: { backgroundColor: parentColors.blue },
  segmentText: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#41526E' },
  segmentTextActive: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  lineTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  lineDue: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  statusPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99 },
  statusPillText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  checkbox: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1.8, marginTop: 2 },
  checkboxOn: { backgroundColor: parentColors.blueDeep, borderColor: parentColors.blueDeep },
  checkboxOff: { backgroundColor: '#fff', borderColor: parentColors.checkboxOff },
  doneCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: parentColors.pillBlueBg, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  lineGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
  lineGridLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.mutedLight, letterSpacing: 0.6 },
  lineGridValue: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 5 },
  lineGridPaid: { backgroundColor: parentColors.duePaidBg, borderRadius: 10, padding: 8, flex: 1 },
  lineGridDue: { backgroundColor: parentColors.dueBg, borderRadius: 10, padding: 8, flex: 1 },
  allPaidBanner: { backgroundColor: parentColors.pillBlueBg, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  allPaidText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  payFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: parentColors.fieldBorder,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F5F8FE',
  },
  amountPrefix: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  amountInput: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep, padding: 0, minWidth: 60 },
  amountHint: { fontSize: 11, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 5, maxWidth: 200 },
  amountError: { fontSize: 11.5, color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 6, maxWidth: 200 },
  payButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  payButtonDisabled: { backgroundColor: parentColors.disabled },
  payButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  historyRef: { fontSize: 11.5, color: parentColors.mutedLight, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  historyAmount: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  downloadBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DCE7FB', backgroundColor: '#fff' },
  downloadBtnText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
});
