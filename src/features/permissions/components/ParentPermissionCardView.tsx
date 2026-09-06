// "Sign as guardian" acts directly -- it IS the consent action, no separate review
// page. Declining is a distinct, deliberate second button right beside it (never
// "not tapping consent"). Tapping anywhere else on the card still opens the full
// detail screen, for a resolved request's history or a longer description.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError } from '@/lib/api';
import { accent, colors, fonts } from '@/lib/theme';
import { useConsentPermissionRequest, useDeclinePermissionRequest } from '../hooks';
import type { PermissionRequestSummary } from '../types';
import { formatDateDisplay, formatInstantDate, formatTimeRange } from '../utils';
import { PermissionStatusPill, toneForRequestStatus } from './PermissionStatusPill';

function footerNoteFor(item: PermissionRequestSummary): string {
  switch (item.status) {
    case 'PENDING':
      return `Respond by ${formatDateDisplay(item.responseDeadline)}`;
    case 'CONSENTED':
      return item.signedAt ? `Signed ${formatInstantDate(item.signedAt)}` : 'Signed';
    case 'DECLINED':
      return item.signedAt ? `Declined ${formatInstantDate(item.signedAt)}` : 'Declined';
    case 'EXPIRED':
      return `Deadline passed (${formatDateDisplay(item.responseDeadline)})`;
    case 'CANCELLED':
      return 'This request was cancelled';
  }
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function ParentPermissionCardView({ item }: { item: PermissionRequestSummary }) {
  const router = useRouter();
  const tone = toneForRequestStatus(item.status);
  const consent = useConsentPermissionRequest();
  const decline = useDeclinePermissionRequest();
  const [pendingAction, setPendingAction] = useState<'consent' | 'decline' | null>(null);

  async function handleConsent() {
    setPendingAction('consent');
    try {
      await consent.mutateAsync(item.id);
    } catch (err) {
      Alert.alert('Unable to record your consent', describeError(err, 'Please try again.'));
    } finally {
      setPendingAction(null);
    }
  }

  function handleDeclinePress() {
    Alert.alert('Decline this request?', `You're declining "${item.activityTitle}" for ${item.studentFirstName}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setPendingAction('decline');
          try {
            await decline.mutateAsync({ id: item.id });
          } catch (err) {
            Alert.alert('Unable to record your decision', describeError(err, 'Please try again.'));
          } finally {
            setPendingAction(null);
          }
        },
      },
    ]);
  }

  const busy = pendingAction !== null;

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/(protected)/my-class/permissions/${item.id}` as never)}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {item.activityTitle}
        </Text>
        <PermissionStatusPill tone={tone} />
      </View>

      <Text style={styles.meta}>
        {item.gradeName}-{item.sectionName} · {formatDateDisplay(item.activityDate)} ·{' '}
        {formatTimeRange(item.startTime, item.endTime)}
      </Text>
      {item.activityDescription ? <Text style={styles.description}>{item.activityDescription}</Text> : null}

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.footerNote}>{footerNoteFor(item)}</Text>
        {item.status === 'PENDING' ? (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleDeclinePress}
              disabled={busy}
              style={[styles.declineButton, busy && styles.buttonDisabled]}
              hitSlop={4}
            >
              {pendingAction === 'decline' ? (
                <ActivityIndicator size="small" color={colors.errorText} />
              ) : (
                <Text style={styles.declineButtonText}>Decline</Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleConsent}
              disabled={busy}
              style={[styles.signButton, busy && styles.buttonDisabled]}
              hitSlop={4}
            >
              {pendingAction === 'consent' ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.signButtonText}>Sign as guardian</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  meta: { marginTop: 4, fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  description: { marginTop: 8, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 14, marginBottom: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  footerNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: 8 },
  buttonDisabled: { opacity: 0.6 },
  signButton: {
    backgroundColor: accent.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 96,
    alignItems: 'center',
  },
  signButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  declineButton: {
    backgroundColor: colors.errorBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 80,
    alignItems: 'center',
  },
  declineButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.errorText },
});
