import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, gradients } from '@/lib/theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function GradientHeader({ title, subtitle, onBack, right }: GradientHeaderProps) {
  return (
    <LinearGradient colors={gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
      <SafeAreaView edges={['top']}>
        <View style={styles.row}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={colors.white} />
            </Pressable>
          ) : (
            <View style={styles.backButtonSpacer} />
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right ? <View>{right}</View> : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36, height: 36 },
  titleBlock: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
});
