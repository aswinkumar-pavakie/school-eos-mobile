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

// IBM Plex Mono -- Principal module's own design reference uses this for IDs,
// dates, phone numbers, reg numbers and currency-adjacent labels.
export const monoFonts = {
  regular: 'IBMPlexMono_400Regular',
  medium: 'IBMPlexMono_500Medium',
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
  bodyMuted: '#41526E',
  mutedSoft: '#7C8DA6',
  // Profile screen's own "Class X · Section Y · Roll Z" line color -- pixel-matched
  // to School App.dc.html's isProfile block, distinct from bodyMuted/mutedSoft.
  classLineMuted: '#5B6B85',
  highlightBg: '#EAF0FD',
  greenBg: '#E6F4EC',
  greenDark: '#1E7A4B',
  chevronBg: '#D3E0F8',
  amberBg: '#FEF3C7',
  amberDark: '#A16207',
  redBg: '#FEE2E2',
  redDark: '#B91C1C',
  coverBg: '#DCE7FB',
} as const;

// Faculty ERP tokens -- pixel-matched to "ERP screen design choice/Faculty
// Module - 2" (its own, distinct design reference; colors are close to but
// NOT identical to parentColors above, e.g. #2563eb vs #2A62F0), kept as its
// own palette for the same reason parentColors is kept separate from the
// auth-flow `colors`.
export const facultyColors = {
  background: '#F7F8FB',
  surface: '#FFFFFF',
  ink: '#0F172A',
  body: '#334155',
  bodyMuted: '#475569',
  muted: '#94A3B8',
  mutedStrong: '#64748B',
  border: '#E8ECF3',
  borderSoft: '#EEF1F6',
  borderLight: '#DBE2EE',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueLight: '#EAF0FD',
  blueTile: '#2F6AE0',
  green: '#16A34A',
  greenDark: '#15803D',
  greenBg: '#DCFCE7',
  red: '#DC2626',
  redDark: '#B91C1C',
  redBg: '#FEE2E2',
  amber: '#F59E0B',
  amberDark: '#A16207',
  amberBg: '#FEF3C7',
  chipTrack: '#EAEDF3',
  rowBg: '#FAFBFE',
  disabled: '#C3CDDF',
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

// Principal app protected-area tokens -- pixel-matched to
// "brain/SIS Principal - App/Principal App.dc.html" (the authoritative design
// reference for this role), NOT parentColors/facultyColors. Kept as its own
// palette for the same reason those are kept separate from each other and
// from the auth-flow `colors` -- an edit to one role's screen can never
// accidentally drift another's.
export const principalColors = {
  primary: '#2F5FF4',
  primaryDark: '#1E3FB8',
  background: '#EDF0F7',
  surface: '#FFFFFF',
  ink: '#0F1B33',
  body: '#4C5B77',
  bodyStrong: '#334262',
  muted: '#6B7A99',
  tertiary: '#8A97B1',
  disabled: '#A2AEC4',
  faint: '#C4CDDE',
  faintStrong: '#C9D3E8',
  border: '#EDF1F9',
  borderSoft: '#E6EBF5',
  borderDashed: '#DCE3F0',
  tint: '#F1F5FF',
  tint2: '#EDF2FD',
  tint3: '#F7F9FD',
  tint4: '#F5F8FE',
  tint5: '#F8FAFE',
  tint6: '#E8EEFC',
  tint7: '#DCE5FB',
  tint8: '#E3EAFB',
  green: '#18794E',
  greenBg: '#E7F5EE',
  red: '#C2400F',
  redAlt: '#C2560F',
  redBg: '#FDECEC',
  redBgAlt: '#FFF1E8',
  purple: '#7A3FB8',
  purpleBg: '#F4ECFD',
  accentOrange: '#FF7A45',
  fabPurple: '#4B31E8',
} as const;

// Sports Admin app tokens -- pixel-matched to "brain/SIS Sports - App/Sports
// Staff Mobile App.dc.html" (the authoritative design reference for this
// role), kept as its own palette for the same isolation reason
// principalColors is kept separate from parentColors/facultyColors -- an
// edit to one role's screen can never accidentally drift another's.
export const sportsColors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  accentDark: '#1E3AD6',
  headerGradientFrom: '#1E3AD6',
  headerGradientTo: '#2563EB',
  background: '#EDEFF3',
  surface: '#FFFFFF',
  ink: '#10233B',
  body: '#4E5A6E',
  bodyStrong: '#3C4A5B',
  muted: '#66738A',
  mutedStrong: '#5C6A7E',
  tertiary: '#6E7A8C',
  faint: '#A9B2C2',
  faintStrong: '#8A94A8',
  border: '#E6E9EE',
  borderSoft: '#F0F2F6',
  borderDashed: '#DDE3EB',
  menuBorder: '#E1E6ED',
  inputBorder: '#DDE3EB',
  tint: '#E4EAFB',
  tint2: '#DCE4F7',
  tint3: '#CBD6F3',
  tint4: '#E8EFFE',
  tint5: '#F4F7FF',
  tint6: '#F7F9FC',
  green: '#047857',
  greenBg: '#ECFDF5',
  amber: '#B45309',
  amberBg: '#FEF6E7',
  red: '#B91C1C',
  redBg: '#FEF2F2',
  slate: '#5A667C',
  slateBg: '#EEF1F6',
  infoText: '#1D4ED8',
  infoBg: '#E8EFFE',
  navyBadge: '#0E1A3C',
} as const;

// Hostel Warden mobile module -- pixel-matched to "brain/SIS Hostel Warden -
// App/Warden App.dc.html"'s own literal hex values (BLUE/LINE constants +
// TONE status-pill map read directly from its script block).
export const hostelWardenColors = {
  primary: '#2A52D8',
  primaryDark: '#1B35A8',
  headerGradientFrom: '#1B35A8',
  headerGradientTo: '#2A52D8',
  background: '#F7F8FB',
  surface: '#FFFFFF',
  ink: '#10233F',
  body: '#4A5462',
  bodyStrong: '#556070',
  muted: '#8B95A3',
  mutedStrong: '#98A2AE',
  tertiary: '#9AA4B0',
  faint: '#6B7580',
  border: '#E6E9EE',
  borderSoft: '#F0F2F6',
  borderDashed: '#DFE6F8',
  inputBorder: '#E6E9EE',
  selectedBorder: '#C3D0FB',
  tint: '#EEF2FE',
  tint2: '#E4EAFA',
  tint3: '#DFE6F8',
  tint4: '#CFDAF6',
  tint5: '#F3F5F9',
  tint6: '#F4F6F9',
  tint7: '#F7F9FF',
  green: '#1C6B3F',
  greenBg: '#E7F4EC',
  amber: '#8A5B18',
  amberBg: '#FDF1E0',
  red: '#9B2323',
  redBg: '#FDEAEA',
  infoText: '#2447C4',
  infoBg: '#EEF2FE',
  presentBorder: '#CFE3D6',
  absentText: '#C0392F',
  absentBorder: '#F3CFCD',
  excusedText: '#B4802A',
  excusedBorder: '#F0DFC2',
  toastBg: '#10233F',
  toastDismiss: '#9FB2D8',
  // Two literal Home-screen values from the design not covered by the
  // token set above (Warden App.dc.html's own isHome block) -- greeting
  // subtitle text and the inactive notice-pager dot.
  subtleText: '#7B8592',
  dotInactive: '#CFD6E2',
  hairline: '#EDEFF3',
} as const;
