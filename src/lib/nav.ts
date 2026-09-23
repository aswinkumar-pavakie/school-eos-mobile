// Faculty and Class Teacher share several screens (attendance.tsx,
// calendar.tsx, class-teacher.tsx, class-results.tsx, student-leave.tsx,
// parent-meetings.tsx) -- their own back buttons used to hardcode a single
// Faculty-only destination (/erp, /academics), so a Class Teacher login
// pressing back landed on a screen built for the other identity entirely
// (the old Faculty ERP grid) rather than its own Class hub. This is the one
// place that decision is made, so it can never drift out of sync again.
export function classHubHref(isClassTeacherLogin: boolean): '/class-teacher/class-hub' | '/faculty/class-hub' {
  return isClassTeacherLogin ? '/class-teacher/class-hub' : '/faculty/class-hub';
}
