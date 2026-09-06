// Local copy of online-classes' PrimaryButton (features never import each other's
// internals) -- identical variants, plus an optional outer `style` so it can sit
// inline in a flex row (Give Consent / Decline side by side).

import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { accent, colors, fonts } from '@/lib/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'accent' | 'danger' | 'outline';
  size?: 'regular' | 'compact';
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'regular',
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'compact' && styles.compact,
        variant === 'primary' && styles.primary,
        variant === 'accent' && styles.accent,
        variant === 'danger' && styles.danger,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.text : colors.white} size="small" />
      ) : (
        <Text
          style={[
            size === 'compact' ? styles.compactLabel : styles.label,
            variant === 'outline' ? styles.outlineLabel : styles.filledLabel,
            isDisabled && variant === 'outline' && styles.disabledOutlineLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  compact: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 34, borderRadius: 8 },
  primary: { backgroundColor: colors.primary },
  accent: { backgroundColor: accent.blue },
  danger: { backgroundColor: colors.errorText },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.bold, fontSize: 14 },
  compactLabel: { fontFamily: fonts.bold, fontSize: 12 },
  filledLabel: { color: colors.white },
  outlineLabel: { color: colors.text },
  disabledOutlineLabel: { color: colors.textMuted },
});
