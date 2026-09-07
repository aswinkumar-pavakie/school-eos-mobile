// Design tokens shared by every auth-flow screen -- identical to the web app's
// (school-eos-website) tokens, for brand consistency across platforms.

export const colors = {
  primary: '#1E3A5F',
  background: '#F6F5F1',
  surface: '#FFFFFF',
  border: '#E3E1D8',
  text: '#22201C',
  textMuted: '#78756B',
  errorBg: '#FDECEA',
  errorText: '#B33A2E',
  white: '#FFFFFF',
} as const;

// Header gradient + icon-circle accent for the Parent Academics/Online Class hub
// screens -- a brighter, more saturated royal blue than colors.primary, matching
// the provided design.
export const gradients = {
  header: ['#3559E8', '#2545C4'] as const,
} as const;

// Vibrant royal-blue accent used across the Parent Academics/Online Class hub
// screens (icon circles, Join buttons, links) -- distinct from the app's more
// muted colors.primary navy used elsewhere (login, Faculty screens).
export const accent = {
  blue: '#3D63E4',
} as const;

// Weight scale matches web: 800 titles, 700 labels, 400 body, 500 error text.
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

// Parent app protected-area tokens -- pixel-matched to
// "ERP screen design choice/School App.dc.html" (the authoritative design
// reference), NOT the auth-flow tokens above. Kept as its own palette rather than
// merged into `colors` so an auth-flow screen edit can never accidentally drift
// this one, and vice versa.
export const parentColors = {
  gradientStart: '#2A62F0',
  gradientEnd: '#1636A4',
  blue: '#2A62F0',
  blueDeep: '#1D4ED8',
  ink: '#0F1B33',
  muted: '#8494AB',
  mutedLight: '#A3AFC0',
  border: '#E8EDF5',
  borderSoft: '#EDF0F5',
  fieldBorder: '#E3E9F3',
  segmentTrack: '#E8EBF1',
  pillBlueBg: '#E6EDFD',
  pillNeutralBg: '#EFF3FA',
  dueBg: '#EFF4FE',
  duePaidBg: '#F7F9FC',
  checkboxOff: '#C6D0DE',
  disabled: '#B9C6DC',
  tabActive: '#1D4ED8',
  tabInactive: '#94A3B8',
  white: '#FFFFFF',
  background: '#F7F9FC',
} as const;

// RN has no CSS box-shadow -- this is "boxShadow:0 2px 10px rgba(15,27,51,.05)"
// from the design reference, expressed the iOS/Android way.
export const cardShadow = {
  shadowColor: '#0F1B33',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
} as const;
