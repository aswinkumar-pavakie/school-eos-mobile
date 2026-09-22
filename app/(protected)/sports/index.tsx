// Sports Admin -> Sports hub. Pixel-matched to Sports Staff Mobile App.dc.html's
// own `isSports` screen (SPORTS_GROUPS: TODAY / PLAYERS & SQUADS / TRAINING /
// SPORTS CO-ORDINATOR groups, same order, same glyph icons -- unicode text,
// exactly as the design itself renders them, not custom SVGs). The design's
// own TODAY group includes a 4th "Message" tile -- previously removed per an
// earlier explicit instruction that sports had no messaging module; restored
// now that SPORTS_ADMIN is a real messaging-enabled role (see
// messaging-roles.constant.ts), pointing at the same real E2EE messaging
// screen every other role's tile does.
//
// Tiles added beyond the literal mobile mock -- Achievements and Coaches
// (real, already-wired backend capabilities with no mobile screen at all),
// plus Budget & approvals and PT / sports periods (full feature parity with
// the website Sports Admin console -- every website feature must exist on
// mobile too so a Sports Admin who only has the app can do everything the
// website can). Also corrected: "Ask Permissions" was previously
// misclassified as a gap -- it's the same real sports_od_request capability
// the website's own OD requests page already uses, now wired for real.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { sportsColors } from '@/lib/theme';
import { IconCircle, SportsSubHeader } from '@/components/sports/primitives';

interface Tile {
  glyph: string;
  label: string;
  href: string;
}
interface Group {
  label: string;
  items: Tile[];
}

const GROUPS: Group[] = [
  {
    label: 'TODAY',
    items: [
      { glyph: '★', label: 'Trials', href: '/sports/trials' },
      { glyph: '✚', label: 'Injury Report', href: '/sports/injuries' },
      { glyph: '⌾', label: 'Ask Permissions', href: '/sports/permissions' },
      { glyph: '✉', label: 'Message', href: '/(protected)/messaging' },
    ],
  },
  {
    label: 'PLAYERS & SQUADS',
    items: [
      { glyph: '◍', label: 'Students', href: '/sports/students' },
      { glyph: '◎', label: 'Squads', href: '/sports/squads' },
      { glyph: '▤', label: 'Calendar', href: '/sports/calendar' },
      { glyph: '⚑', label: 'Fixtures', href: '/sports/fixtures' },
      { glyph: '🏆', label: 'Achievements', href: '/sports/achievements' },
    ],
  },
  {
    label: 'TRAINING',
    items: [
      { glyph: '⟳', label: 'Sessions', href: '/sports/sessions' },
      { glyph: '▥', label: 'Practice Plan', href: '/sports/practice' },
      { glyph: '▶', label: 'Live Session', href: '/sports/live' },
      { glyph: '✎', label: 'Entry Results', href: '/sports/results' },
    ],
  },
  {
    label: 'SPORTS CO-ORDINATOR',
    items: [
      { glyph: '▦', label: 'Meet Setup', href: '/sports/meets' },
      { glyph: '◔', label: 'Selection Window', href: '/sports/selection' },
      { glyph: '⇄', label: 'Substitute Coach', href: '/sports/substitutes' },
      { glyph: '☑', label: 'Result Verification', href: '/sports/verification' },
      { glyph: '⊞', label: 'Equipment', href: '/sports/equipment' },
      { glyph: '☺', label: 'Coaches', href: '/sports/coaches' },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { glyph: '₹', label: 'Budget & Approvals', href: '/sports/budget' },
      { glyph: '▤', label: 'PT Periods', href: '/sports/pt' },
    ],
  },
];

export default function SportsHubScreen() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Sports" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        {GROUPS.map((g) => (
          <View key={g.label} style={styles.group}>
            <Text style={styles.groupLabel}>{g.label}</Text>
            <View style={styles.grid}>
              {g.items.map((it) => (
                <Pressable key={it.label} style={styles.item} onPress={() => router.push(it.href as never)}>
                  <IconCircle glyph={it.glyph} />
                  <Text style={styles.itemLabel} numberOfLines={2}>{it.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 22 },
  group: { gap: 14 },
  groupLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2, color: sportsColors.tertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, columnGap: 12 },
  item: { width: '21.5%', alignItems: 'center', gap: 8 },
  itemLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: sportsColors.bodyStrong, textAlign: 'center', lineHeight: 15 },
});
