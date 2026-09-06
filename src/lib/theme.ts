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
