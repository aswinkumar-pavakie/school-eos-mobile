import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/lib/theme';

interface SelectFieldProps {
  label: string;
  value: string | null;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

// An inline expanding dropdown -- tapping the control reveals the option list
// directly beneath it, in normal document flow (pushing whatever follows further
// down the screen), never a Modal/bottom-sheet popup floating over the rest of the
// form. Shared across features (online-classes' Schedule form, Permissions' Post
// request form) -- lives here, not inside one feature folder, since features never
// import each other's internals.
export function SelectField({ label, value, placeholder, options, onSelect, disabled }: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(item: string) {
    onSelect(item);
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen((o) => !o)}
        style={[styles.control, disabled && styles.controlDisabled, open && styles.controlOpen]}
      >
        <Text style={[styles.controlText, !value && styles.placeholder]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.optionList}>
          {options.map((item, index) => (
            <Pressable
              key={item}
              onPress={() => handleSelect(item)}
              style={[styles.option, index === options.length - 1 && styles.optionLast]}
            >
              <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>{item}</Text>
              {item === value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  controlOpen: { borderColor: colors.primary },
  controlDisabled: { opacity: 0.5 },
  controlText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, flex: 1 },
  placeholder: { color: colors.textMuted },
  optionList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLast: { borderBottomWidth: 0 },
  optionText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  optionTextSelected: { fontFamily: fonts.bold, color: colors.primary },
});
