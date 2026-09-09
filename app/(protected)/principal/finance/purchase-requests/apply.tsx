// Principal -> Finance -> Raise a purchase/service request -- the one
// backend-confirmed Principal-EXCLUSIVE write in this whole module.
// POST /finance/purchase-requests carries @Roles('PRINCIPAL') as its own
// method-level override (neither FINANCE nor ADMIN can create via this
// endpoint) -- confirmed by direct backend audit. Routes through the same
// generic approvals engine every other approval-integrated feature in this
// app already uses (PURCHASE_REQUEST policy row) -- no new approval engine.
// This screen adapts a real, correctly-typed API client function
// (createPurchaseRequest) that existed in the web app's own finance-api.ts
// with zero UI ever built for it.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { createPurchaseRequest, type PurchaseRequestType } from '@/lib/principal-finance-api';

export default function PrincipalPurchaseRequestApply() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requestType, setRequestType] = useState<PurchaseRequestType>('GOODS');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createPurchaseRequest({
        requestType,
        itemName: itemName.trim(),
        description: description.trim() || undefined,
        quantity: quantity.trim() ? Number(quantity.trim()) : undefined,
        vendorName: vendorName.trim() || undefined,
        estimatedAmountPaise: estimatedAmount.trim() ? String(Math.round(Number(estimatedAmount.trim()) * 100)) : undefined,
        neededBy: neededBy.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['principal-finance', 'purchase-requests'] });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit this request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="New Request" subtitle="Purchase or service request" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Request type</Text>
        <View style={styles.typeRow}>
          {(['GOODS', 'SERVICE'] as PurchaseRequestType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setRequestType(t)}
              style={[styles.typeChip, requestType === t && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, requestType === t && styles.typeChipTextActive]}>
                {t === 'GOODS' ? 'Goods (Purchase)' : 'Service'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Item / service name *</Text>
        <TextInput
          value={itemName}
          onChangeText={setItemName}
          placeholder="e.g. Science lab microscopes"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.input}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Details about what's needed and why"
          placeholderTextColor={parentColors.mutedLight}
          style={[styles.input, styles.textArea]}
          multiline
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 10"
              placeholderTextColor={parentColors.mutedLight}
              style={styles.input}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Estimated amount (₹)</Text>
            <TextInput
              value={estimatedAmount}
              onChangeText={setEstimatedAmount}
              placeholder="e.g. 25000"
              placeholderTextColor={parentColors.mutedLight}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Vendor (if known)</Text>
        <TextInput
          value={vendorName}
          onChangeText={setVendorName}
          placeholder="e.g. Global Lab Supplies"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.input}
        />

        <Text style={styles.label}>Needed by</Text>
        <TextInput
          value={neededBy}
          onChangeText={setNeededBy}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitButtonText}>{submitting ? 'Submitting…' : 'Submit request'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  typeChipText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  typeChipTextActive: { color: '#fff' },
  errorText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#B33A2E', marginTop: 14 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#fff' },
});
