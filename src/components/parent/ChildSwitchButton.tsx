// "Switch child" control for a Parent screen's header (AppHeader's `right`
// slot). Uses the same selected-child state as Home, Fees and My class
// (useSelectedChild), so picking a child here changes it everywhere. Renders
// nothing for a parent with a single child -- there is nothing to switch.

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { parentColors } from '@/lib/theme';

export function ChildSwitchButton() {
  const { children, selected, selectChild } = useSelectedChild();
  const [open, setOpen] = useState(false);

  if (children.length < 2) return null;

  return (
    <>
      <Pressable style={styles.pill} onPress={() => setOpen(true)} hitSlop={8} accessibilityLabel="Switch child">
        <Text style={styles.pillText} numberOfLines={1}>
          {selected?.studentName.split(' ')[0] ?? 'Switch'}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Switch child</Text>
            {children.map((c) => {
              const active = c.studentId === selected?.studentId;
              return (
                <Pressable
                  key={c.studentId}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    selectChild(c.studentId);
                    setOpen(false);
                  }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{c.studentName.trim()[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{c.studentName}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{[c.gradeName, c.sectionName].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={parentColors.blue} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 120, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  pillText: { color: '#fff', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 28, paddingHorizontal: 18 },
  sheetTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 12 },
  rowActive: { backgroundColor: '#EEF3FF' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  name: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted, marginTop: 2 },
});
