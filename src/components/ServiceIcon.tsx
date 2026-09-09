// Exact icon paths lifted from "ERP screen design choice/School App.dc.html"'s own
// FRAMES/ICONS objects (concatenated the same way its icon(key,color) method does:
// FRAMES[key] + " " + ICONS[key], frame first) -- not redrawn/approximated, so
// every icon on My class matches the design reference stroke-for-stroke.

import Svg, { Path } from 'react-native-svg';

const FRAMES = {
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
  // Faculty ERP tiles (see "ERP screen design choice/Faculty Module - 2") --
  // wired one feature at a time; see faculty/*.tsx for what's real so far.
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
  // Missing FRAME halves completed cosmetically (no frame/icon pair existed
  // for these in either design's own reference): a bar_chart baseline and a
  // library shelf-line.
  report: 'M3 20h18',
  library: 'M3 21h18',
  // Subjects (syllabus progress) -- the design's own script has no icon
  // FRAME/ICON pair for this tile at all (only a title string), so this is
  // an original open-book silhouette, drawn in the same single-Path stroke
  // style as everything else in this file.
  subjects: 'M12 5c-2.5-1.3-5.3-1.3-8-.5v13.5c2.7-.8 5.5-.8 8 .5c2.5-1.3 5.3-1.3 8-.5V4.5c-2.7-.8-5.5-.8-8 .5z',
  // Academic Coordinator -- no design reference exists for this tile at all
  // (a genuinely new role-conditional feature); a shield/badge frame reads as
  // "an assigned authority/scope", matching the role's own nature.
  coordinator: 'M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z',
  // Hostel Warden ERP grid -- original icons (no design-reference file exists for
  // this role in "ERP screen design choice", unlike the Faculty/Parent tiles
  // above), drawn in the same single-Path stroke style as the rest of this file.
  nightAttendance: 'M12 3a9 9 0 1 0 8.5 12',
  studyAttendance: 'M4 5h8v14H4zM12 5h8v14h-8z',
  gatePass: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16',
  callRequest: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C10.5 21 3 13.5 3 6a2 2 0 0 1 2-2z',
  visitorLog: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.3 2.7-5 6-5s6 1.7 6 5M13 15c2.8.3 5 1.9 5 5',
  emergencyExit: 'M19 4h-6l-3 5 3 5-3 5h9',
  classAbsence: 'M2 9l10-5 10 5-10 5z',
  roomBed: 'M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v3M21 18v3M3 13V8a2 2 0 0 1 2-2h4v5',
  complaints: 'M14.5 3.5l6 6L9 21l-6-1.5L4.5 12z',
  roomDetails: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01',
  // Community ERP grid -- original icons (no design-reference file exists for
  // this role either, same situation as Hostel Warden above).
  proposal: 'M6 3h9l4 4v14H6z',
  activity: 'M3 5h18v16H3zM8 3v4M16 3v4',
  communityProfile: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.3 2.7-5 6-5s6 1.7 6 5M13 15c2.8.3 5 1.9 5 5',
  // Vice Principal shell nav -- original icons (no design reference exists
  // for this role either, same situation as Hostel Warden/Community above).
  // Most nav items below reuse an existing key instead (Faculty->classTeacher,
  // Examinations->exams, Calendar->events, Transport->transport, Hostel->
  // roomBed, Library->library, Finance->fees, Communities->communityProfile,
  // Announcements->announcements, Reports->report, Audit Log->records,
  // Requests & Approvals->consent, Settings->settings, Attendance->
  // attendance) -- these twelve are for the genuinely new concepts only.
  dashboard: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  students: 'M12 4 2 9l10 5 8-4.2V15h1V9zM6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5',
  parents: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2 20c0-3.3 2.7-5 6-5s6 1.7 6 5M15 20c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5',
  academicsSection: 'M12 6c-2-1.3-5-1.3-7 0v12c2-1.3 5-1.3 7 0c2-1.3 5-1.3 7 0V6c-2-1.3-5-1.3-7 0zM12 6v12',
  timetable: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 13h3M8 17h3M13 13h3M13 17h3',
  inventory: 'M3 8l9-5 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9',
  maintenance: 'M14.7 6.3a4 4 0 1 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2z',
  notifications: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  profile: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5',
  // My Attendance -- a watch face (own original design, not the institutional
  // "attendance" calendar-and-check tile), reading as "my own time record"
  // rather than the school-wide attendance oversight tile above.
  myAttendance: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 4v1M12 19v1M4 12h1M19 12h1',
  // My Leave -- a briefcase (own original design, not the institutional
  // "leave" door-and-arrow tile), reading as "my own time-off request".
  myLeave: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  // My Day (Phase 30) -- a sunrise (own original design), reading as "today,
  // at a glance", distinct from every other tile's box/badge/circle shapes.
  myDay: 'M4 18h16M2 18a10 10 0 0 1 20 0M12 4v2M4.2 8.2l1.4 1.4M19.8 8.2l-1.4 1.4',
} satisfies Record<string, string>;

const ICONS = {
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
  // Missing ICON half completed cosmetically -- menu_book page-lines.
  records: 'M6 8h4M6 12h4M14 8h4M14 12h4',
  coordinator: 'M9 12l2 2 4-4',
  subjects: 'M12 5v13.5',
  myAttendance: 'M12 8v5l3 2',
  myLeave: 'M4 13h16',
} satisfies Record<string, string>;

export type ServiceIconKey = keyof typeof ICONS | keyof typeof FRAMES;

const framesByKey: Partial<Record<ServiceIconKey, string>> = FRAMES;
const iconsByKey: Partial<Record<ServiceIconKey, string>> = ICONS;

export function ServiceIcon({ name, color = '#fff', size = 26 }: { name: ServiceIconKey; color?: string; size?: number }) {
  const d = [framesByKey[name], iconsByKey[name]].filter(Boolean).join(' ');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d={d} />
    </Svg>
  );
}
