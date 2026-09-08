// Shared bottom tab bar -- persistent chrome rendered once by the (protected) root
// layout, not a per-screen thing, matching "ERP screen design choice/School App.dc.html"
// (the bottom nav markup sits outside that prototype's own screen-switch block, always
// visible). Pixel values: 74px height, top border #E8EDF5, 4 equal columns, 22px
// icons, active #1D4ED8 / inactive #94A3B8.
//
// Only Home and My class are real, wired destinations for this build (Academics/My
// Bus are simple placeholders per plan -- the Fees feature is the one thing that
// has to be complete here). Fees itself is reached from My class, not its own tab,
// but the design reference's own tabOf() mapping still shows "My class" as the
// active tab while a Fees screen is open -- replicated below via pathname prefix.
//
// Role-aware as of the Events feature: a FACULTY login sees "ERP" (matching the
// Faculty reference screen, "ERP screen design choice/Faculty Module - 2") instead
// of "My class" in that same second-tab slot, pointing at /erp instead of
// /my-class -- everything else (Home/Academics/Bus) is unchanged for either role.
// PRINCIPAL gets the same "ERP" tab -- /erp's own redirect sends them on to
// /principal, mirroring exactly how it already redirects Hostel Warden.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { parentColors } from '@/lib/theme';

type TabKey = 'home' | 'school' | 'academics' | 'bus';

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9}>
      <Path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

function SchoolIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9}>
      <Rect x={3} y={4} width={18} height={13} rx={2} />
      <Path d="M7 8h7M7 12h4M8 20l4-3 4 3" />
    </Svg>
  );
}

function AcademicsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9}>
      <Path d="M2 8.5 12 4l10 4.5L12 13z" />
      <Path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </Svg>
  );
}

function BusIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9}>
      <Rect x={4} y={4} width={16} height={12} rx={2} />
      <Path d="M4 10h16M7 20v-2M17 20v-2" />
    </Svg>
  );
}

type SecondTabHref = '/my-class' | '/erp';

// Faculty AND Hostel Warden both get "ERP" in the second tab slot (Warden's own
// operational launcher lives behind /erp -- see erp/index.tsx's redirect); only
// Parent sees "My class" there.
function tabsFor(
  showErp: boolean,
): { key: TabKey; label: string; href: '/' | SecondTabHref | '/academics' | '/my-bus'; Icon: typeof HomeIcon }[] {
  return [
    { key: 'home', label: 'Home', href: '/', Icon: HomeIcon },
    showErp
      ? { key: 'school', label: 'ERP', href: '/erp', Icon: SchoolIcon }
      : { key: 'school', label: 'My class', href: '/my-class', Icon: SchoolIcon },
    { key: 'academics', label: 'Academics', href: '/academics', Icon: AcademicsIcon },
    { key: 'bus', label: 'My Bus', href: '/my-bus', Icon: BusIcon },
  ];
}

function activeTabFor(pathname: string): TabKey {
  if (pathname === '/' || pathname === '') return 'home';
  if (
    pathname.startsWith('/my-class') ||
    pathname.startsWith('/fees') ||
    pathname.startsWith('/erp') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/permissions') ||
    // Covers both the Warden's own /hostel-warden subtree and the Parent's
    // /hostel/{gate-pass,emergency-exit,call}-requests subtree.
    pathname.startsWith('/hostel')
  )
    return 'school';
  if (pathname.startsWith('/academics') || pathname.startsWith('/online-classes')) return 'academics';
  if (pathname.startsWith('/my-bus')) return 'bus';
  return 'school';
}

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const active = activeTabFor(pathname);
  const { isFaculty, isHostelWarden, isPrincipal } = useCurrentRoles();
  const TABS = tabsFor(isFaculty || isHostelWarden || isPrincipal);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? parentColors.tabActive : parentColors.tabInactive;
        return (
          <Pressable key={tab.key} onPress={() => router.replace(tab.href as never)} style={styles.tab} hitSlop={4}>
            <tab.Icon color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: parentColors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingTop: 10,
  },
  label: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
