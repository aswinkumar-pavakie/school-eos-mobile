// Parent's own request detail -- full event details, then exactly the
// state-driven action set the user asked for: while PENDING, "Reject" or "Sign
// as Guardian"; once APPROVED, both are replaced with a single "Download
// permission letter" button; once REJECTED, no further action is possible
// (deleting + faculty re-adding the student is the only way to get a fresh
// request, by design -- see the plan's CRUD note).

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { formatDate, formatTime } from '@/lib/format';
import { getPermissionLetter, getPermissionRequest, rejectPermissionRequest } from '@/lib/permission-requests-api';
import { printPermissionLetter } from '@/lib/permission-letter-print';
import { parentColors, cardShadow } from '@/lib/theme';

export default function PermissionRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [downloadingLetter, setDownloadingLetter] = useState(false);

  const detailQuery = useQuery({ queryKey: ['permission-request', id], queryFn: () => getPermissionRequest(id!), enabled: !!id });

  function confirmReject() {
    Alert.alert('Reject this request?', 'This cannot be undone from here — the teacher will need to add the student again to re-request.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setRejecting(true);
          try {
            await rejectPermissionRequest(id!);
            queryClient.invalidateQueries({ queryKey: ['permission-request', id] });
            queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
          } catch (err) {
            Alert.alert('Could not reject', err instanceof Error ? err.message : 'Please try again.');
          } finally {
            setRejecting(false);
          }
        },
      },
    ]);
  }

  async function handleDownloadLetter() {
    setDownloadingLetter(true);
    try {
      const letter = await getPermissionLetter(id!);
      await printPermissionLetter(letter);
    } catch (err) {
      Alert.alert('Could not open letter', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDownloadingLetter(false);
    }
  }

  const detail = detailQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title={detail?.event.name ?? 'Permission request'} onBack={() => router.replace('/permissions')} />
      <ScrollView contentContainerStyle={styles.content}>
        {detailQuery.isLoading || !detail ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.rowLabel}>Location</Text>
              <Text style={styles.rowValue}>{detail.event.location}</Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>When</Text>
              <Text style={styles.rowValue}>
                {formatDate(detail.event.startsAt)} · {formatTime(detail.event.startsAt)} – {formatTime(detail.event.endsAt)}
              </Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Purpose</Text>
              <Text style={styles.rowValue}>{detail.event.purpose}</Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Supervised by</Text>
              <Text style={styles.rowValue}>
                {detail.event.monitoringTeacherName}
                {detail.event.monitoringTeacherDesignation ? ` · ${detail.event.monitoringTeacherDesignation}` : ''}
              </Text>
            </View>

            {detail.participant.state === 'PENDING' ? (
              <View style={styles.actionsRow}>
                <Pressable style={styles.rejectButton} onPress={confirmReject} disabled={rejecting}>
                  {rejecting ? <ActivityIndicator color="#B33A2E" /> : <Text style={styles.rejectButtonText}>Reject</Text>}
                </Pressable>
                <Pressable style={styles.signButton} onPress={() => router.push(`/permissions/${id}/sign`)}>
                  <Text style={styles.signButtonText}>Sign as Guardian</Text>
                </Pressable>
              </View>
            ) : detail.participant.state === 'APPROVED' ? (
              <Pressable style={styles.letterButton} onPress={handleDownloadLetter} disabled={downloadingLetter}>
                {downloadingLetter ? <ActivityIndicator color="#fff" /> : <Text style={styles.letterButtonText}>Download permission letter</Text>}
              </Pressable>
            ) : (
              <View style={styles.rejectedBanner}>
                <Text style={styles.rejectedBannerText}>You rejected this request{detail.participant.decidedAt ? ` on ${formatDate(detail.participant.decidedAt)}` : ''}.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  rowLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.mutedLight, letterSpacing: 0.5, textTransform: 'uppercase' },
  rowValue: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  rejectButton: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#F3C3BC', backgroundColor: '#FDECEA' },
  rejectButtonText: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
  signButton: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: parentColors.blue },
  signButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
  letterButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: parentColors.blue },
  letterButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15.5 },
  rejectedBanner: { backgroundColor: '#FDECEA', borderRadius: 14, padding: 16 },
  rejectedBannerText: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, textAlign: 'center' },
});
