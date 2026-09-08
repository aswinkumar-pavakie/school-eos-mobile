// Only backend-allowed transitions are offered (HOSTEL_COMPLAINT_ALLOWED_TRANSITIONS
// mirrors ComplaintsService's own state machine) -- no arbitrary status picker, and
// no staff-reassignment control (assignedTo stays Admin-set, per the backend's own
// authorization rule).

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  getComplaint,
  HOSTEL_COMPLAINT_ALLOWED_TRANSITIONS,
  updateComplaintStatus,
  type HostelComplaintState,
} from '@/lib/hostel-warden-api';
import { complaintStatusMeta, issueTypeLabel } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const queryKey = ['hostel-warden', 'complaint', id];
  const detailQuery = useQuery({ queryKey, queryFn: () => getComplaint(id!), enabled: !!id });

  const updateMutation = useMutation({
    mutationFn: (state: HostelComplaintState) => updateComplaintStatus(id!, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['hostel-warden', 'complaints'] });
    },
    onError: (err) => {
      Alert.alert('Could not update status', err instanceof ApiError ? err.message : 'Please try again.');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  function confirmTransition(target: HostelComplaintState) {
    Alert.alert(`Move to ${complaintStatusMeta(target).label}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateMutation.mutate(target) },
    ]);
  }

  const complaint = detailQuery.data;
  const allowedTransitions = complaint ? HOSTEL_COMPLAINT_ALLOWED_TRANSITIONS[complaint.state] : [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Complaint" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {detailQuery.isLoading || !complaint ? (
          detailQuery.isError ? (
            <ErrorState
              message={detailQuery.error instanceof ApiError ? detailQuery.error.message : 'Unable to load this complaint.'}
              onRetry={() => detailQuery.refetch()}
            />
          ) : (
            <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
          )
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
              <View style={styles.headerRow}>
                <Text style={styles.subject}>{complaint.subject}</Text>
                <StatusBadge {...complaintStatusMeta(complaint.state)} />
              </View>
              <Text style={styles.rowLabel}>Issue type</Text>
              <Text style={styles.rowValue}>{issueTypeLabel(complaint.issueType)}</Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Description</Text>
              <Text style={styles.rowValue}>{complaint.description}</Text>
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Reported</Text>
              <Text style={styles.rowValue}>{formatDateTime(complaint.createdAt)}</Text>
              {complaint.resolvedAt ? (
                <>
                  <Text style={[styles.rowLabel, { marginTop: 12 }]}>Resolved</Text>
                  <Text style={styles.rowValue}>{formatDateTime(complaint.resolvedAt)}</Text>
                </>
              ) : null}
            </View>

            {allowedTransitions.length > 0 ? (
              <View style={[styles.card, cardShadow]}>
                <Text style={styles.sectionTitle}>Update status</Text>
                <View style={styles.transitionsRow}>
                  {allowedTransitions.map((target) => (
                    <Pressable
                      key={target}
                      style={styles.transitionButton}
                      onPress={() => confirmTransition(target)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <ActivityIndicator color={parentColors.blue} size="small" />
                      ) : (
                        <Text style={styles.transitionButtonText}>{complaintStatusMeta(target).label}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  subject: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, flex: 1 },
  rowLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: parentColors.mutedLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowValue: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, marginTop: 3 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginBottom: 12 },
  transitionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  transitionButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: parentColors.border,
    paddingHorizontal: 18,
  },
  transitionButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: parentColors.ink },
});
