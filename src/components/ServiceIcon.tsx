// Exact icon paths lifted from "ERP screen design choice/School App.dc.html"'s own
// FRAMES/ICONS objects (concatenated the same way its icon(key,color) method does:
// FRAMES[key] + " " + ICONS[key], frame first) -- not redrawn/approximated, so
// every icon on My class matches the design reference stroke-for-stroke.

import Svg, { Path } from 'react-native-svg';

const FRAMES: Record<string, string> = {
  messages: 'M4 5h16v11H4l-3 4z',
  consent: 'M6 3h12v18H6z',
  canteen: 'M4 20h16',
  settings:
    'M12 4l1.6 1.2 2-.3.7 1.9 1.9.7-.3 2L19 12l-1.1 1.5.3 2-1.9.7-.7 1.9-2-.3L12 20l-1.6-1.2-2 .3-.7-1.9-1.9-.7.3-2L5 12l1.1-1.5-.3-2 1.9-.7.7-1.9 2 .3z',
  onlineclass: 'M3 5h18v14H3z',
  attendance: 'M3 5h18v16H3zM8 3v4M16 3v4',
  fees: 'M3 6h18v12H3z',
  homework: 'M4 5h16v14H4z',
  leave: 'M15 4h5v16h-5',
  exams: 'M3 5h18v16H3z',
  certificates: 'M6 3h9l4 4v14H6z',
  transport: 'M4 5h16v11H4z',
  health: 'M12 4l8 4v5c0 4-3.4 6.3-8 7-4.6-.7-8-3-8-7V8z',
  meetings: 'M9 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5',
  // Faculty ERP tiles (see "ERP screen design choice/Faculty Module - 2") -- only
  // `events` is a real, wired destination; the rest are visual-only placeholders,
  // same convention my-class/index.tsx already uses for every non-Fees tile.
  records: 'M4 4h8v16H4zM12 4h8v16h-8z',
  marksEntry: 'M4 5h16v14H4z',
  announcements: 'M3 9h4l6-4v14l-6-4H3z',
  classTeacher: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6',
  od: 'M4 7h16v13H4z',
  venue: 'M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z',
  payroll: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  payslip: 'M6 3h12v18l-3-2-3 2-3-2-3 2z',
  appraisal: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.7 7.1 18.2l.9-5.5-4-3.9 5.5-.8z',
  events: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16',
};

const ICONS: Record<string, string> = {
  messages: 'M7 9h10M7 13h6',
  consent: 'M8 12l2.5 2.5L16 9',
  canteen: 'M8 4v7a2 2 0 0 0 4 0V4M16 4v16',
  settings: 'M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5',
  attendance: 'M8 14l2.5 2.5L16 11',
  report: 'M5 20V10M12 20V4M19 20v-7',
  fees: 'M3 11h18',
  homework: 'M8 9h8M8 13h5',
  leave: 'M4 12h9M10 8l4 4-4 4',
  exams: 'M7 10h2M11 10h2M15 10h2M7 14h2M11 14h2',
  certificates: 'M14 3v5h5',
  transport: 'M4 11h16M7 20v-3M17 20v-3',
  library: 'M5 19V6h5v13zM14 19V6h5v13z',
  health: 'M9 12l2 2 4-4',
  feedback: 'M12 4l2.3 4.9 5.2.7-3.8 3.7.9 5.3L12 16l-4.6 2.6.9-5.3L4.5 9.6l5.2-.7z',
  meetings: 'M17 8h4M19 6v4',
  onlineclass: 'M10 9.5l4.5 2.5-4.5 2.5z',
  marksEntry: 'M8 16l2-5 7-7 3 3-7 7-5 2z',
  announcements: 'M13 8a4 4 0 0 1 0 8',
  classTeacher: 'M17 8h4M19 6v4',
  od: 'M9 7V5a3 3 0 0 1 6 0v2',
  venue: 'M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  payroll: 'M9 8h6M9 12h4M10 16V8',
  payslip: 'M9 8h6M9 12h6M9 16h4',
  events: 'M9 15l2 2 4-4',
};

export type ServiceIconKey = keyof typeof ICONS | keyof typeof FRAMES;

export function ServiceIcon({ name, color = '#fff', size = 26 }: { name: ServiceIconKey; color?: string; size?: number }) {
  const d = [FRAMES[name], ICONS[name]].filter(Boolean).join(' ');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d={d} />
    </Svg>
  );
}
