// Sports Admin -> Budget & approvals. Real listBudgetRequests()/
// createBudgetRequest() -- reuses the real purchase_request/approval_policy
// engine (see school-eos-backend migration
// 0024_sports_budget_approval_policy.sql), same real endpoints the website
// Sports Admin console uses. Full feature parity with the website: this
// screen did not exist in the mobile design's own screen set, added here so
// a Sports Admin who only has the app can do everything the website can.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { createBudgetRequest, listBudgetRequests } from '@/lib/sports-api';

function formatMoney(paise: string | null): string {
  if (!paise) return '—';
  const rupees = Number(paise) / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function BudgetRequestsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const requestsQuery = useQuery({ queryKey: ['sports-budget-requests'], queryFn: listBudgetRequests });

  const createMutation = useMutation({
    mutationFn: () => {
      const rupees = Number(amount);
      if (!title.trim()) throw new Error('Enter what the request is for.');
      if (!Number.isFinite(rupees) || rupees <= 0) throw new Error('Enter a valid amount.');
      return createBudgetRequest({
        title: title.trim(),
        description: description.trim() || undefined,
        estimatedAmountPaise: String(Math.round(rupees * 100)),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-budget-requests'] });
      setShowAdd(false);
      setTitle('');
      setDescription('');
      setAmount('');
    },
  });

  const sorted = [...(requestsQuery.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Budget & approvals" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Raise request'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Request</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Coach travel for state meet" placeholderTextColor={sportsColors.faint} style={styles.input} />
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="Details" placeholderTextColor={sportsColors.faint} style={styles.input} multiline />
            <Text style={styles.label}>Estimated amount (₹)</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="15000" placeholderTextColor={sportsColors.faint} keyboardType="numeric" style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Submitting…' : 'Submit'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Budget requests</Text>
          <Text style={styles.count}>{sorted.length} raised</Text>
        </View>

        {sorted.length === 0 ? (
          <EmptyPanel label="No budget requests raised yet." />
        ) : (
          sorted.map((r) => (
            <Card key={r.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle}>{r.itemName}</Text>
                  {r.description ? <Text style={styles.rowSub}>{r.description}</Text> : null}
                </View>
                <StatusPill label={r.state.toLowerCase()} />
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Amount</Text>
                  <Text style={styles.metaValue}>{formatMoney(r.estimatedAmountPaise)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Raised by</Text>
                  <Text style={styles.metaValue}>{r.requestedByName ?? '—'}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  addButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: sportsColors.tertiary },
  input: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: sportsColors.ink },
  error: { fontSize: 12.5, color: sportsColors.red },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingTop: 2 },
  title: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  count: { fontSize: 11.5, color: sportsColors.tertiary },
  rowCard: { gap: 12, padding: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, lineHeight: 19 },
  rowSub: { fontSize: 12.5, color: sportsColors.mutedStrong },
  metaBlock: { gap: 7, borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, paddingTop: 11 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaKey: { flex: 1, fontSize: 12, color: sportsColors.tertiary },
  metaValue: { flex: 1.2, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong, textAlign: 'right' },
});
