// Parent action screen -- "Sign as guardian" navigates here to REVIEW first;
// actual approval only happens via the explicit "Give Consent" button below, never
// on tapping into this screen (matches the product rule that opening a request is
// not the same as approving it).

import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/GradientHeader';
import { ErrorState, LoadingState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { PermissionStatusPill, toneForRequestStatus } from '../components/PermissionStatusPill';
import { useConsentPermissionRequest, useDeclinePermissionRequest, usePermissionRequestDetail } from '../hooks';
import { formatDateDisplay, formatTimeRange } from '../utils';

export function PermissionRequestDetailScreen({ requestId }: { requestId: string }) {
  const router = useRouter();
  const detail = usePermissionRequestDetail(requestId);
  const consent = useConsentPermissionRequest();
  const decline = useDeclinePermissionRequest();

  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (detail.isLoading) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Permission" onBack={() => router.back()} />
        <LoadingState />
      </View>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Permission" onBack={() => router.back()} />
        <ErrorState message="Unable to load this request." onRetry={() => detail.refetch()} />
      </View>
    );
  }

  const item = detail.data;
  const tone = toneForRequestStatus(item.status);
  const isActionable = item.status === 'PENDING';

  async function handleConsent() {
    setActionError(null);
    try {
      await consent.mutateAsync(requestId);
      router.back();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        Alert.alert('Something went wrong', 'Unable to record your consent. Please try again.');
      }
    }
  }

  async function handleConfirmDecline() {
    setActionError(null);
    try {
      await decline.mutateAsync({ id: requestId, reason: reason.trim() || undefined });
      router.back();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        Alert.alert('Something went wrong', 'Unable to record your decision. Please try again.');
      }
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <GradientHeader
        title="Permission"
        subtitle={item.gradeName + '-' + item.sectionName}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.activityTitle}</Text>
          <PermissionStatusPill tone={tone} />
        </View>

        <Text style={styles.meta}>
          {formatDateDisplay(item.activityDate)} · {formatTimeRange(item.startTime, item.endTime)}
        </Text>

        {item.activityDescription ? <Text style={styles.description}>{item.activityDescription}</Text> : null}

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Student</Text>
          <Text style={styles.infoValue}>
            {item.studentFirstName} {item.studentLastName}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Response deadline</Text>
          <Text style={styles.infoValue}>{formatDateDisplay(item.responseDeadline)}</Text>
        </View>

        {item.status === 'DECLINED' && item.declineReason ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Reason given</Text>
            <Text style={styles.infoValue}>{item.declineReason}</Text>
          </View>
        ) : null}

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {isActionable ? (
          declining ? (
            <View style={styles.declineBox}>
              <Text style={styles.label}>Reason (optional)</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                style={[styles.input, styles.multiline]}
                multiline
                placeholder="Let the school know why (optional)"
                placeholderTextColor={colors.textMuted}
              />
              <PrimaryButton
                label="Confirm decline"
                onPress={handleConfirmDecline}
                loading={decline.isPending}
                variant="danger"
              />
              <PrimaryButton label="Cancel" onPress={() => setDeclining(false)} variant="outline" />
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <PrimaryButton
                label="Give Consent"
                onPress={handleConsent}
                loading={consent.isPending}
                style={styles.flex1}
              />
              <PrimaryButton label="Decline" onPress={() => setDeclining(true)} variant="danger" style={styles.flex1} />
            </View>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontFamily: fonts.extraBold, fontSize: 18, color: colors.text },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.text },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  infoLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' },
  infoValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.errorText },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  flex1: { flex: 1 },
  declineBox: { gap: 10, marginTop: 8 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
