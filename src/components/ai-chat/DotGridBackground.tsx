// Pixel-matched to the user's own reference (Cloudflare's "Ask AI" empty
// panel) and to the website's own AI-chat DotGridBackground: a dotted grid,
// using the exact same real brand blue (#2B6FE0, this app's own
// --color-primary on the website) rather than the reference's orange or
// this app's own slightly different mobile accent.blue -- one brand color
// across both platforms. No cursor exists on a touchscreen, so unlike the
// website's mouse-follow spotlight, this is the static ambient dot field
// alone; it stays behind the conversation for the life of the screen, not
// just the empty state.

import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { StyleSheet } from 'react-native';

const BRAND_BLUE = '#2B6FE0';

export function DotGridBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="ai-chat-dots" width={14} height={14} patternUnits="userSpaceOnUse">
          <Circle cx={1} cy={1} r={0.8} fill={BRAND_BLUE} opacity={0.2} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#ai-chat-dots)" />
    </Svg>
  );
}
