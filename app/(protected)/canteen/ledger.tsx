// Canteen counter's Ledger screen -- exactly the spec'd flow: staff enters
// an amount, taps "Move to ledger", then a loading state represents
// waiting for the NFC card tap that will identify the student. No physical
// reader is connected yet, so this stage doubles as the simulation: staff
// searches and picks the student themselves (searchCanteenStudents), which
// stands in for the real card tap that will drive this exact same step
// once a reader exists. Picking a student immediately fires the real
// charge (chargeCanteenWallet, real atomic wallet debit on the backend),
// shows a second loading state while it runs, then the success receipt
// (amount deducted + new balance) or the real backend error verbatim
// (insufficient balance, frozen wallet, etc.). Closing the receipt resets
// the form -- the charge itself is already permanently recorded (the
// History tab reads the same real canteen_transaction rows this just
// wrote).

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { CanteenHeader } from '@/components/canteen/primitives';
import { parentColors } from '@/lib/theme';
import { formatMoneyDetail } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { chargeCanteenWallet, searchCanteenStudents, type CanteenChargeReceipt, type CanteenStudent } from '@/lib/canteen-api';

type Stage = 'amount' | 'waiting' | 'charging' | 'success' | 'error';

function CheckIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={parentColors.greenDark} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 13l4 4L19 7" />
    </Svg>
  );
}
function CrossIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth={2.6} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export default function CanteenLedgerScreen() {
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<Stage>('amount');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [receipt, setReceipt] = useState<CanteenChargeReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountPaise = Math.round((parseFloat(amount) || 0) * 100);
  const canSubmit = amountPaise > 0;

  // Debounced independently of the query itself -- setDebouncedQuery only
  // ever runs inside the timeout callback, never synchronously in the
  // effect body, so it can't cascade-render the way a bare `setState`
  // directly in an effect body can.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const trimmedQuery = debouncedQuery.trim();
  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ['canteen-search', trimmedQuery],
    queryFn: () => searchCanteenStudents(trimmedQuery),
    enabled: stage === 'waiting' && trimmedQuery.length >= 2,
  });

  function moveToLedger() {
    if (!canSubmit) return;
    setQuery('');
    setDebouncedQuery('');
    setError(null);
    setStage('waiting');
  }

  async function simulateCardTap(student: CanteenStudent) {
    setStage('charging');
    setError(null);
    try {
      // Fresh per request, never reused across a different student/amount --
      // makes a genuine network-level retry of THIS exact request safe (the
      // backend replays the original result instead of double-charging).
      // Same real convention already used elsewhere in this app (see
      // src/features/messaging/api.ts, src/features/online-classes/api.ts).
      const idempotencyKey = Crypto.randomUUID();
      const result = await chargeCanteenWallet(student.id, amountPaise, idempotencyKey);
      setReceipt(result);
      setStage('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete this charge.');
      setStage('error');
    }
  }

  function closeAndReset() {
    setStage('amount');
    setAmount('');
    setReceipt(null);
    setError(null);
    setQuery('');
    setDebouncedQuery('');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CanteenHeader title="Ledger" subtitle="Charge a student's canteen wallet" />
      <View style={styles.body}>
        {stage === 'amount' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New canteen charge</Text>
            <Text style={styles.cardSub}>Enter the purchase amount, then move to ledger to identify the student.</Text>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountField}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={parentColors.mutedLight}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
            </View>
            <Pressable
              onPress={moveToLedger}
              disabled={!canSubmit}
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
            >
              <Text style={styles.primaryButtonText}>Move to ledger</Text>
            </Pressable>
          </View>
        )}

        {stage === 'waiting' && (
          <View style={styles.card}>
            <View style={styles.centerBlock}>
              <ActivityIndicator color={parentColors.blue} size="small" />
              <Text style={styles.cardTitle}>Waiting for card…</Text>
              <Text style={styles.cardSub}>
                No NFC reader is connected yet — search for the student below to simulate the card tap.
              </Text>
            </View>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or admission number…"
              placeholderTextColor={parentColors.mutedLight}
              style={styles.searchInput}
            />
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              ListEmptyComponent={
                searching ? (
                  <Text style={styles.emptyText}>Searching…</Text>
                ) : query.trim().length >= 2 ? (
                  <Text style={styles.emptyText}>No matching students.</Text>
                ) : null
              }
              renderItem={({ item }) => {
                const disabled = !item.hasWallet || !item.walletActive;
                return (
                  <Pressable
                    disabled={disabled}
                    onPress={() => simulateCardTap(item)}
                    style={[styles.resultRow, disabled && styles.resultRowDisabled]}
                  >
                    <View style={styles.flexShrink}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultMeta}>
                        {item.admissionNo}
                        {item.gradeName ? ` · ${item.gradeName}${item.sectionName ? `-${item.sectionName}` : ''}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.resultBalance}>
                      {!item.hasWallet ? 'No wallet' : !item.walletActive ? 'Frozen' : formatMoneyDetail(item.balancePaise ?? 0)}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <Pressable onPress={() => setStage('amount')} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {stage === 'charging' && (
          <View style={styles.card}>
            <View style={styles.centerBlock}>
              <ActivityIndicator color={parentColors.blue} size="small" />
              <Text style={styles.cardTitle}>Posting to ledger…</Text>
              <Text style={styles.cardSub}>Charging the student&rsquo;s wallet.</Text>
            </View>
          </View>
        )}

        {stage === 'success' && receipt && (
          <View style={styles.card}>
            <View style={styles.centerBlock}>
              <View style={[styles.badge, { backgroundColor: parentColors.greenBg }]}>
                <CheckIcon />
              </View>
              <Text style={styles.cardTitle}>Charged successfully</Text>
              <Text style={styles.cardSub}>
                {receipt.studentName} · {receipt.admissionNo}
              </Text>
            </View>
            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount deducted</Text>
                <Text style={styles.receiptNeg}>-{formatMoneyDetail(receipt.amountPaise)}</Text>
              </View>
              <View style={[styles.receiptRow, styles.receiptRowBorder]}>
                <Text style={styles.receiptLabel}>Remaining balance</Text>
                <Text style={styles.receiptValue}>{formatMoneyDetail(receipt.balanceAfterPaise)}</Text>
              </View>
            </View>
            <Pressable onPress={closeAndReset} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Close</Text>
            </Pressable>
          </View>
        )}

        {stage === 'error' && (
          <View style={styles.card}>
            <View style={styles.centerBlock}>
              <View style={[styles.badge, { backgroundColor: '#FDECEC' }]}>
                <CrossIcon />
              </View>
              <Text style={styles.cardTitle}>Could not complete this charge</Text>
              <Text style={styles.cardSub}>{error}</Text>
            </View>
            <Pressable onPress={() => setStage('waiting')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
            <Pressable onPress={closeAndReset} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  body: { flex: 1, padding: 16 },
  card: { flex: 1, backgroundColor: parentColors.white, borderRadius: 16, borderWidth: 1, borderColor: parentColors.border, padding: 20 },
  centerBlock: { alignItems: 'center', gap: 6, paddingVertical: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: parentColors.ink, textAlign: 'center' },
  cardSub: { fontSize: 13, color: parentColors.muted, textAlign: 'center', marginTop: 2 },
  label: { marginTop: 22, fontSize: 12, fontWeight: '700', color: parentColors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  amountField: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    backgroundColor: parentColors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rupee: { fontSize: 18, fontWeight: '800', color: parentColors.muted },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800', color: parentColors.ink, padding: 0 },
  primaryButton: { marginTop: 22, borderRadius: 12, backgroundColor: parentColors.blue, paddingVertical: 15, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryButton: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: parentColors.border, paddingVertical: 13, alignItems: 'center' },
  secondaryButtonText: { color: parentColors.muted, fontSize: 14, fontWeight: '700' },
  searchInput: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    backgroundColor: parentColors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: parentColors.ink,
  },
  resultsList: { marginTop: 12, maxHeight: 320 },
  emptyText: { padding: 14, fontSize: 13, color: parentColors.muted, textAlign: 'center' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: parentColors.borderSoft,
  },
  resultRowDisabled: { opacity: 0.4 },
  flexShrink: { flexShrink: 1 },
  resultName: { fontSize: 14.5, fontWeight: '700', color: parentColors.ink },
  resultMeta: { fontSize: 12, color: parentColors.muted, marginTop: 1 },
  resultBalance: { fontSize: 12.5, fontWeight: '700', color: parentColors.muted },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  receiptBox: { marginTop: 18, borderRadius: 12, backgroundColor: parentColors.background, padding: 14 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  receiptRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft, marginTop: 2, paddingTop: 10 },
  receiptLabel: { fontSize: 13, color: parentColors.muted },
  receiptNeg: { fontSize: 15, fontWeight: '800', color: '#C0392B' },
  receiptValue: { fontSize: 15, fontWeight: '800', color: parentColors.ink },
});
