// Hostel Warden app -- exact SVG path data ported from "brain/SIS Hostel
// Warden - App/Warden App.dc.html"'s own script block (NAV/GRID icon `d`
// strings, viewBox 24x24, stroke-based). This design uses real vector
// icons, not unicode glyphs (unlike the Sports design) -- pixel accuracy
// here means reproducing the exact path data, not substituting a
// lookalike icon from a different set.

import Svg, { Path } from 'react-native-svg';

function Icon({ d, color = '#fff', size = 22, strokeWidth = 2 }: { d: string; color?: string; size?: number; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export const ICON_PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  hostel: 'M3 21V8l9-5 9 5v13M9 21v-5h6v5',
  gate: 'M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15M4 11h16M10 4v17M14 4v17',
  students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.9',
  study: 'M12 6v14M12 6C10 4 7 4 3 5v13c4-1 7-1 9 1M12 6c2-2 5-2 9-1v13c-4-1-7-1-9 1',
  gatelogOut: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  gatelogIn: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M14 17l5-5-5-5M19 12H7',
  rooms: 'M3 3h18v18H3zM3 9h18M9 21V9',
  fees: 'M2 7h20v10H2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6 12h.01M18 12h.01',
  mess: 'M4 3v8a3 3 0 0 0 6 0V3M7 11v10M17 3c-1.7 0-3 2-3 5s1.3 4 3 4 3-1 3-4-1.3-5-3-5M17 12v9',
  issues: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM12 8v4M12 14h.01',
  staff: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19 8v6M22 11h-6',
} as const;

export type IconKey = keyof typeof ICON_PATHS;

export function HostelIcon({ name, color, size, strokeWidth }: { name: IconKey; color?: string; size?: number; strokeWidth?: number }) {
  return <Icon d={ICON_PATHS[name]} color={color} size={size} strokeWidth={strokeWidth} />;
}
