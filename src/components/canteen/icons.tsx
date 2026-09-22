// Canteen dashboard's stat-tile icon chips -- same 2-path/stroke-width-1.8
// convention as the rest of this app's hand-rolled icon sets.

import Svg, { Path } from 'react-native-svg';
import { canteenColors } from '@/lib/theme';

export function WalletIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={canteenColors.blueDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 7.5h14a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
      <Path d="M16 12.5h3v3h-3a1.5 1.5 0 0 1 0-3z" />
    </Svg>
  );
}
export function ReceiptIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={canteenColors.blueDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <Path d="M9 8h6 M9 12h6" />
    </Svg>
  );
}
export function PeopleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={canteenColors.blueDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <Path d="M2 21c0-3.8 3.3-5.8 7-5.8s7 2 7 5.8" />
    </Svg>
  );
}
export function TrendIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={canteenColors.blueDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 17l5-5 3.5 2.5L20 7" />
      <Path d="M16 7h4v4" />
    </Svg>
  );
}
