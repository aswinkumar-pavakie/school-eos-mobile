// A required-reason text prompt for actions the backend's own DTO requires a
// comment for (e.g. RejectApprovalDto -- "Reject always demands a reason").
// A plain cross-platform RN <Modal>, not Alert.prompt -- Alert.prompt only exists
// on iOS, so it can't be used for an Android-supported action like this one.

import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { parentColors } from '@/lib/theme';

export function ReasonModal({
  visible,
  title,
  submitLabel,
  submitting,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  submitLabel: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  function handleCancel() {
    setReason('');
    onCancel();
  }

  function handleSubmit() {
    if (!reason.trim()) return;
    onSubmit(reason.trim());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter a reason"
            placeholderTextColor={parentColors.mutedLight}
            multiline
            autoFocus
          />
          <View style={styles.row}>
            <Pressable style={styles.cancelButton} onPress={handleCancel} disabled={submitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, !reason.trim() && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{submitLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,27,51,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  title: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginBottom: 14 },
  label: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelButton: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: parentColors.border },
  cancelText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14.5, color: parentColors.ink },
  submitButton: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#B33A2E' },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: '#fff' },
});
