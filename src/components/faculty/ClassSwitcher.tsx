// Dropdown-pill class switcher -- pixel-matches the Faculty design's own
// "CLASS" picker (used on Attendance/Records/Marks Entry/Class Results/Class
// Teacher). A single reusable component since every advisor- or teaching-
// scoped screen needs the exact same interaction: tap to expand a list of
// real class options, tap one to select and collapse.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { facultyColors } from '@/lib/theme';

function GroupsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={facultyColors.blue} strokeWidth={1.8}>
      <Path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 2.5-5 6-5s6 2 6 5M16 8a2.5 2.5 0 1 0 0-5M18 13c2 .3 3 1.6 3 3.5" />
    </Svg>
  );
}

function UnfoldIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={facultyColors.mutedStrong} strokeWidth={2}>
      <Path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </Svg>
  );
}

export interface ClassOption {
  key: string;
  label: string;
}

export function ClassSwitcher({
  label = 'CLASS',
  options,
  selectedKey,
  onSelect,
}: {
  label?: string;
  options: ClassOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === selectedKey);

  return (
    <View>
      <Pressable style={styles.pill} onPress={() => setOpen((o) => !o)}>
        <View style={styles.iconBox}>
          <GroupsIcon />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value} numberOfLines={1}>
            {selected?.label ?? 'Select a class'}
          </Text>
        </View>
        <UnfoldIcon />
      </Pressable>
      {open ? (
        <View style={styles.dropdown}>
          {options.map((o, i) => {
            const isSelected = o.key === selectedKey;
            return (
              <Pressable
                key={o.key}
                style={[
                  styles.option,
                  i === options.length - 1 && styles.optionLast,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() => {
                  onSelect(o.key);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]} numberOfLines={1}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: facultyColors.surface,
    borderWidth: 1,
    borderColor: facultyColors.borderLight,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: facultyColors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  label: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1 },
  value: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink, marginTop: 2 },
  dropdown: {
    marginTop: 6,
    backgroundColor: facultyColors.surface,
    borderWidth: 1,
    borderColor: facultyColors.borderLight,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 6,
  },
  option: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: facultyColors.borderSoft,
  },
  optionLast: { borderBottomWidth: 0 },
  optionSelected: { backgroundColor: facultyColors.blueLight },
  optionText: { fontSize: 14, color: facultyColors.body, fontFamily: 'PlusJakartaSans_500Medium' },
  optionTextSelected: { color: facultyColors.blueDark, fontFamily: 'PlusJakartaSans_700Bold' },
});
