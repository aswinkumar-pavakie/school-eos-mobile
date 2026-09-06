// Shared gradient header -- back button + title/subtitle -- used by every screen
// except Home (Home gets its own greeting/avatar header, out of scope here). Pixel
// values match "ERP screen design choice/School App.dc.html"'s `notHome` header
// block: linear-gradient(135deg,#2A62F0,#1636A4), 44px rounded-back-button,
// 21px/800 title, 13px/600 subtitle at 78% white.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { parentColors } from '@/lib/theme';

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
      <Path d="M14 6l-6 6 6 6" />
    </Svg>
  );
}

export function AppHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <LinearGradient colors={[parentColors.gradientStart, parentColors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.row}>
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 21,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 2,
  },
});
