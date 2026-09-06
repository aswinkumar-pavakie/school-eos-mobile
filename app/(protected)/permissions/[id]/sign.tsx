// "Sign as Guardian" -- draw a real digital signature (SignaturePad, pure
// react-native-svg + PanResponder, no new native module), with its own built-in
// Reset (in case of a wrong/accidental stroke), then Approve uploads the
// captured PNG and returns to the request list, where Reject/Sign are now gone
// and "Download permission letter" has taken their place.

import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { SignaturePad, type SignaturePadHandle } from '@/components/SignaturePad';
import { signPermissionRequest } from '@/lib/permission-requests-api';
import { parentColors, cardShadow } from '@/lib/theme';

export default function SignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    const base64 = await padRef.current?.capture();
    if (!base64) {
      Alert.alert('Signature required', 'Please sign in the box above before approving.');
      return;
    }
    setSubmitting(true);
    try {
      await signPermissionRequest(id!, base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
      queryClient.invalidateQueries({ queryKey: ['permission-request', id] });
      queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
      router.replace(`/permissions/${id}`);
    } catch (err) {
      Alert.alert('Could not submit signature', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Sign as Guardian" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.instructions}>
            By signing below, you confirm that you are the parent/guardian of this student and consent to their participation in this event.
          </Text>
          <SignaturePad padRef={padRef} onChange={setHasSignature} />
        </View>

        <Pressable style={[styles.approveButton, (!hasSignature || submitting) && styles.approveButtonDisabled]} onPress={handleApprove} disabled={!hasSignature || submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveButtonText}>Approve</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  instructions: { fontSize: 13.5, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 14, lineHeight: 19 },
  approveButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  approveButtonDisabled: { backgroundColor: parentColors.disabled },
  approveButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16 },
});
