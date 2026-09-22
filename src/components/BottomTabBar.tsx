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
import { HostelIcon } from '@/components/hostel-warden/icons';
import { parentColors } from '@/lib/theme';

type TabKey = 'home' | 'school' | 'academics' | 'bus' | 'hostel' | 'gate' | 'students' | 'profile';

// Sports Admin's own real tab set, pixel-matched to Sports Staff Mobile
// App.dc.html's own `const TABS = [['home','Home','⌂'],['sports','Sports','◎'],
// ['bus','Bus','⊟']]` -- exactly 3 tabs, no Academics tab at all (Academics
// has no meaning for this role), and the design's own glyph icons (unicode
// text, not custom SVGs -- replicated as-is, the design itself never draws
// real icon paths for these).
function GlyphIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 21, color, lineHeight: 24 }}>{glyph}</Text>;
}
const SPORTS_TABS: { key: TabKey; label: string; href: '/' | '/sports' | '/my-bus'; Icon: typeof HomeIcon }[] = [
  { key: 'home', label: 'Home', href: '/', Icon: ({ color }) => <GlyphIcon glyph="⌂" color={color} /> },
  { key: 'school', label: 'Sports', href: '/sports', Icon: ({ color }) => <GlyphIcon glyph="◎" color={color} /> },
  { key: 'bus', label: 'Bus', href: '/my-bus', Icon: ({ color }) => <GlyphIcon glyph="⊟" color={color} /> },
];

// Hostel Warden's own real tab set, pixel-matched to Warden App.dc.html's
// own `NAV = [['home','Home',...],['hostel','Hostel',...],['gate','Gate',...]]`
// -- exactly 3 tabs (no Academics/My Bus for this role), real vector icons
// (not glyphs) ported from the design's own path data via HostelIcon.
const HOSTEL_WARDEN_TABS: { key: TabKey; label: string; href: '/' | '/(protected)/hostel-warden' | '/(protected)/hostel-warden/gate'; Icon: typeof HomeIcon }[] = [
  { key: 'home', label: 'Home', href: '/', Icon: ({ color }) => <HostelIcon name="home" color={color} size={22} strokeWidth={1.9} /> },
  { key: 'hostel', label: 'Hostel', href: '/(protected)/hostel-warden', Icon: ({ color }) => <HostelIcon name="hostel" color={color} size={22} strokeWidth={1.9} /> },
  { key: 'gate', label: 'Gate', href: '/(protected)/hostel-warden/gate', Icon: ({ color }) => <HostelIcon name="gate" color={color} size={22} strokeWidth={1.9} /> },
];

function activeTabForHostelWarden(pathname: string): TabKey {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/hostel-warden/gate')) return 'gate';
  if (pathname.startsWith('/hostel-warden') || pathname.startsWith('/erp')) return 'hostel';
  return 'hostel';
}

// Driver's own real 4-tab set -- Home, My Students, My Bus, My Profile are
// the role's only real destinations (same routes DriverHome's own menu tiles
// already point at: app/(protected)/driver/{students,bus,profile}). No
// Academics, no My class -- neither concept exists for this role.
function StudentsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9}>
      <Path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <Path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h2a4.5 4.5 0 0 1 4.5 4.5V20M14.5 14.3A4 4 0 0 1 18 18v2" />
    </Svg>
  );
}
function DriverProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9}>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="M8 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5.5 17.5A2.8 2.8 0 0 1 8 16h0a2.8 2.8 0 0 1 2.5 1.5M14 9h5M14 13h5" />
    </Svg>
  );
}
const DRIVER_TABS: {
  key: TabKey;
  label: string;
  href: '/' | '/(protected)/driver/students' | '/(protected)/driver/bus' | '/(protected)/driver/profile';
  Icon: typeof HomeIcon;
}[] = [
  { key: 'home', label: 'Home', href: '/', Icon: HomeIcon },
  { key: 'students', label: 'Students', href: '/(protected)/driver/students', Icon: StudentsIcon },
  { key: 'bus', label: 'My Bus', href: '/(protected)/driver/bus', Icon: BusIcon },
  { key: 'profile', label: 'Profile', href: '/(protected)/driver/profile', Icon: DriverProfileIcon },
];

function activeTabForDriver(pathname: string): TabKey {
  if (pathname.startsWith('/driver/students')) return 'students';
  if (pathname.startsWith('/driver/bus')) return 'bus';
  if (pathname.startsWith('/driver/profile')) return 'profile';
  return 'home';
}

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
//
// Community drops Academics/My Bus entirely -- neither concept exists for a
// standalone Community login (no academic record, no transport enrollment).
// Vice Principal drops ONLY Academics -- its own Academics now lives inside
// its ERP shell (vice-principal/index.tsx's ACADEMICS section) instead of
// this bottom-tab placeholder; My Bus is left as-is for VP, scope limited to
// exactly what was asked. Hostel Warden no longer goes through this generic
// function at all -- see HOSTEL_WARDEN_TABS below (its own real 3-tab set,
// pixel-matched to its own design), bypassed the same way Sports Admin's
// SPORTS_TABS already is.
function tabsFor(
  showErp: boolean,
  hideAcademics: boolean,
  hideBus: boolean,
): { key: TabKey; label: string; href: '/' | SecondTabHref | '/academics' | '/my-bus'; Icon: typeof HomeIcon }[] {
  const tabs: ReturnType<typeof tabsFor> = [
    { key: 'home', label: 'Home', href: '/', Icon: HomeIcon },
    showErp
      ? { key: 'school', label: 'ERP', href: '/erp', Icon: SchoolIcon }
      : { key: 'school', label: 'My class', href: '/my-class', Icon: SchoolIcon },
  ];
  if (!hideAcademics) {
    tabs.push({ key: 'academics', label: 'Academics', href: '/academics', Icon: AcademicsIcon });
  }
  if (!hideBus) {
    tabs.push({ key: 'bus', label: 'My Bus', href: '/my-bus', Icon: BusIcon });
  }
  return tabs;
}

function activeTabFor(pathname: string): TabKey {
  if (pathname === '/' || pathname === '') return 'home';
  if (
    pathname.startsWith('/my-class') ||
    pathname.startsWith('/fees') ||
    pathname.startsWith('/erp') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/permissions') ||
    pathname.startsWith('/sports') ||
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
  const { isFaculty, isHostelWarden, isPrincipal, isVicePrincipal, isCommunity, isSportsAdmin, isDriver } =
    useCurrentRoles();
  const TABS = isDriver
    ? DRIVER_TABS
    : isSportsAdmin
      ? SPORTS_TABS
      : isHostelWarden
        ? HOSTEL_WARDEN_TABS
        : tabsFor(
            isFaculty || isPrincipal || isVicePrincipal || isCommunity,
            isVicePrincipal || isCommunity,
            isCommunity,
          );
  const active = isDriver
    ? activeTabForDriver(pathname)
    : isHostelWarden
      ? activeTabForHostelWarden(pathname)
      : activeTabFor(pathname);

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
