// Health In-charge app -- own icon set, same structural convention as
// src/components/hostel-warden/icons.tsx (stroke-based, 24x24 viewBox, one
// shared Icon() wrapper, a named IconKey union). There is no design mock for
// this role to port path data from, so these are original, simple line-icon
// shapes drawn to match that same visual weight (2px stroke, rounded caps).

import Svg, { Path, Circle } from 'react-native-svg';

function Icon({ d, color = '#fff', size = 22, strokeWidth = 2 }: { d: string; color?: string; size?: number; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export const ICON_PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  // A first-aid / medical cross in a rounded square -- this console's own mark.
  health: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8v8M8 12h8',
  // Clipboard with a plus -- "record a visit".
  visits: 'M9 3h6v3H9zM6 5h2M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M12 11v6M9 14h6',
  students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.9',
  alerts: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  // A phone handset -- "contact a parent / doctor".
  contact: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z',
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
} as const;

export type IconKey = keyof typeof ICON_PATHS;

export function HealthIcon({ name, color, size, strokeWidth }: { name: IconKey; color?: string; size?: number; strokeWidth?: number }) {
  return <Icon d={ICON_PATHS[name]} color={color} size={size} strokeWidth={strokeWidth} />;
}

/** Small filled dot, e.g. an unread/open badge on a tab or list row. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Circle cx={4} cy={4} r={4} fill={color} />
    </Svg>
  );
}
