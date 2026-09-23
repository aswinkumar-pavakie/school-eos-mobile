// Instagram-style "switch accounts" sheet -- pressing the profile avatar on
// Home opens this instead of a plain "Switch" pill. Purely a nicer entry
// point: selecting the other account still navigates to the existing
// /switch-account screen, which does the actual work unchanged (instant
// swap if already linked, else the one-time credential form) -- see
// src/lib/auth.ts's switchToLinkedIdentity/linkAndSwitchIdentity, neither
// of which this file touches.

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { facultyColors } from '@/lib/theme';
import type { IdentityLabel } from '@/lib/auth';

function labelText(label: IdentityLabel | null): string {
  if (label === 'FACULTY') return 'Faculty';
  if (label === 'CLASS_TEACHER') return 'Class Teacher';
  return 'Account';
}

function initialsOf(text: string): string {
  return text.trim().slice(0, 2).toUpperCase();
}

interface AccountRow {
  label: IdentityLabel;
  identifier: string | null;
  isActive: boolean;
  /** Only false for a not-yet-linked row -- tapping it starts the one-time
   * credential form instead of an instant switch (same screen either way). */
  isLinked: boolean;
}

export function AccountSwitcherModal({
  visible,
  onClose,
  activeLabel,
  activeIdentifier,
  linkedLabel,
  linkedIdentifier,
  canAddAccount,
}: {
  visible: boolean;
  onClose: () => void;
  activeLabel: IdentityLabel | null;
  activeIdentifier: string | null;
  linkedLabel: IdentityLabel | null;
  linkedIdentifier: string | null;
  /** Whether the OTHER identity is real and reachable at all (a Faculty
   * member's own class-teacher-link check, or simply true for the Class
   * Teacher side switching back to Faculty) -- controls whether the
   * not-yet-linked row shows at all when nothing is linked yet. */
  canAddAccount: boolean;
}) {
  const router = useRouter();

  const otherLabel: IdentityLabel = activeLabel === 'FACULTY' ? 'CLASS_TEACHER' : 'FACULTY';
  const rows: AccountRow[] = [{ label: activeLabel ?? 'OTHER', identifier: activeIdentifier, isActive: true, isLinked: true }];
  if (linkedLabel && linkedIdentifier) {
    rows.push({ label: linkedLabel, identifier: linkedIdentifier, isActive: false, isLinked: true });
  } else if (canAddAccount) {
    rows.push({ label: otherLabel, identifier: null, isActive: false, isLinked: false });
  }

  function handleSelect(row: AccountRow) {
    if (row.isActive) return;
    onClose();
    router.push('/(protected)/switch-account' as never);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Switch account</Text>

          {rows.map((row) => (
            <Pressable
              key={row.label}
              style={styles.row}
              onPress={() => handleSelect(row)}
              disabled={row.isActive}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsOf(labelText(row.label))}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowLabel}>{labelText(row.label)}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {row.identifier ?? 'Tap to add this account'}
                </Text>
              </View>
              {row.isActive ? (
                <Ionicons name="checkmark-circle" size={22} color={facultyColors.blue} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={facultyColors.muted} />
              )}
            </Pressable>
          ))}

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingBottom: 28, paddingHorizontal: 18 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  rowLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: facultyColors.muted, marginTop: 2 },
  cancelButton: { marginTop: 10, paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EDF0F6' },
  cancelText: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.muted },
});
