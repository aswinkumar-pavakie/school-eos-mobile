// Two (or more) equal-width pill tabs sharing one track -- used wherever a screen
// splits "create" and "history" into tabs instead of a separate pushed route
// (Visitor Log, Hostel Complaints). Generic/shared, not Hostel-Warden-specific.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { parentColors } from '@/lib/theme';

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.track}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: parentColors.segmentTrack,
    borderRadius: 12,
    padding: 4,
    margin: 16,
    marginBottom: 8,
  },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  pillActive: { backgroundColor: '#fff', ...cardShadowInline() },
  label: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted },
  labelActive: { color: parentColors.ink },
});

// Inline (not the shared `cardShadow` import) to avoid a circular-looking import
// for such a small tweak -- same shadow values as theme.ts's cardShadow.
function cardShadowInline() {
  return {
    shadowColor: '#0F1B33',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  };
}
