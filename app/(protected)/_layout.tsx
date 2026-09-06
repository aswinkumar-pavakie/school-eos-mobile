import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { BottomTabBar } from '@/components/BottomTabBar';
import { parentColors } from '@/lib/theme';

// Real navigation shell: whichever screen matched (Home/My class/Academics/My Bus/
// Fees) fills the content area; the bottom tab bar is persistent chrome rendered
// once here, not per-screen -- matches the design reference, where the bottom nav
// sits outside the screen-switch block and never disappears (Fees included).
// Session-based guarding is still not implemented here -- unrelated to this feature.
export default function ProtectedLayout() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: parentColors.background,
  },
  content: {
    flex: 1,
  },
});
