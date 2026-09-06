// Shared status pill for the Permissions feature -- mirrors the tone-based pattern
// already used by online-classes' SessionStatusPill (see that file), so pills
// don't visually drift between features.

import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import type { PermissionActivityStatus, PermissionRequestStatus } from '../types';

export type PermissionPillTone = 'actionNeeded' | 'signed' | 'declined' | 'expired' | 'cancelled';

const LABEL_BY_TONE: Record<PermissionPillTone, string> = {
  actionNeeded: 'Action needed',
  signed: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export function toneForRequestStatus(status: PermissionRequestStatus): PermissionPillTone {
  switch (status) {
    case 'PENDING':
      return 'actionNeeded';
    case 'CONSENTED':
      return 'signed';
    case 'DECLINED':
      return 'declined';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
      return 'cancelled';
  }
}

export function toneForActivityStatus(status: PermissionActivityStatus): PermissionPillTone {
  return status === 'CANCELLED' ? 'cancelled' : 'signed';
}

export function PermissionStatusPill({ tone, label }: { tone: PermissionPillTone; label?: string }) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={[styles.text, styles[`${tone}Text` as const]]}>{label ?? LABEL_BY_TONE[tone]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: { fontFamily: fonts.bold, fontSize: 11 },

  actionNeeded: { backgroundColor: colors.primary },
  actionNeededText: { color: colors.white },

  signed: { backgroundColor: '#EAF1FB' },
  signedText: { color: colors.primary },

  declined: { backgroundColor: colors.errorBg },
  declinedText: { color: colors.errorText },

  expired: { backgroundColor: colors.border },
  expiredText: { color: colors.textMuted },

  cancelled: { backgroundColor: colors.border },
  cancelledText: { color: colors.textMuted },
});
