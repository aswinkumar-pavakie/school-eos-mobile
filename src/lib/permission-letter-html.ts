// Same real-letterhead approach as receipt-html.ts (same header styling, same
// real school-profile fields, no placeholder text anywhere) -- reimplemented as
// a standalone HTML string for expo-print. One template, reused for every event
// (built entirely from the real fields in PermissionLetterPayload), matching a
// standard formal school-consent-letter format: From / To / Subject / body /
// Thanking you / signature.

import { formatDate, formatDateTime, formatTime } from './format';
import type { PermissionLetterPayload } from './permission-requests-api';

function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildPermissionLetterHtml(letter: PermissionLetterPayload): string {
  const { event, monitoringTeacher, student, classTeacherName, parent, school, signatureUrl } = letter;

  const schoolAddressLine = [school?.addressLine1, school?.addressLine2, school?.city, school?.district, school?.state, school?.pincode]
    .filter(Boolean)
    .join(', ');
  const schoolContactLine = [school?.contactPhone ? `Phone: ${school.contactPhone}` : null, school?.contactEmail].filter(Boolean).join(' · ');

  const parentAddressLine = [parent.addressLine1, parent.addressLine2, parent.city, parent.state, parent.pincode].filter(Boolean).join(', ');

  const studentClass = [student.gradeName, student.sectionName].filter(Boolean).join(' - ');
  const sameDay = new Date(event.startsAt).toDateString() === new Date(event.endsAt).toDateString();
  const eventWhen = sameDay
    ? `${formatDate(event.startsAt)}, ${formatTime(event.startsAt)} to ${formatTime(event.endsAt)}`
    : `${formatDateTime(event.startsAt)} to ${formatDateTime(event.endsAt)}`;

  // One reusable, professional paragraph -- built entirely from the real event/
  // student/teacher fields, never hand-typed per event.
  const bodyParagraph = `We are writing to seek your kind permission for your ward, <strong>${esc(student.name)}</strong>
    (Roll No. ${esc(String(student.rollNo ?? '—'))}, ${esc(studentClass || 'Class not assigned')}), to participate in
    "<strong>${esc(event.name)}</strong>", to be held at <strong>${esc(event.location)}</strong> on
    <strong>${esc(eventWhen)}</strong>. The purpose of this event is: ${esc(event.purpose)}. Your ward will be under
    the supervision of ${esc(monitoringTeacher.name)}${monitoringTeacher.designation ? ` (${esc(monitoringTeacher.designation)})` : ''}
    throughout the event. We request you to grant your consent for your ward's participation by signing below.`;

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; padding: 28px; font-size: 13.5px; line-height: 1.6; }
  .header { text-align: center; border-bottom: 2px solid #1B3F9E; padding-bottom: 14px; margin-bottom: 22px; }
  .school { font-size: 20px; font-weight: 800; color: #1B3F9E; margin: 0; }
  .muted { color: #6b7280; font-size: 11px; margin: 2px 0; }
  .letter-title { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px; }
  .date-row { text-align: right; font-size: 12.5px; color: #374151; margin-bottom: 18px; }
  .block { margin-bottom: 16px; }
  .block-label { font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; margin-bottom: 3px; }
  .block-name { font-weight: 700; font-size: 14px; }
  .subject { margin: 20px 0; padding: 10px 12px; background: #F5F8FE; border-left: 3px solid #1B3F9E; font-size: 13px; }
  .subject strong { color: #1B3F9E; }
  .body-text { margin: 16px 0; text-align: justify; }
  .closing { margin-top: 22px; }
  .sign-block { margin-top: 40px; }
  .sign-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
  .sign-image { height: 60px; max-width: 220px; display: block; }
  .sign-line { border-top: 1px solid #9ca3af; width: 220px; margin-top: 4px; padding-top: 4px; font-size: 11px; color: #6b7280; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 26px; }
</style></head>
<body>
  <div class="header">
    <p class="school">${esc(school?.name ?? 'School EOS')}</p>
    ${schoolAddressLine ? `<p class="muted">${esc(schoolAddressLine)}</p>` : ''}
    ${schoolContactLine ? `<p class="muted">${esc(schoolContactLine)}</p>` : ''}
    <p class="letter-title">Event Participation Permission Letter</p>
  </div>

  <p class="date-row">Date: ${formatDate(letter.decidedAt ?? new Date().toISOString())}</p>

  <div class="block">
    <p class="block-label">From</p>
    <p class="block-name">${esc(classTeacherName ?? 'Class Teacher')}</p>
    <p class="muted">Class Teacher, ${esc(school?.name ?? 'School EOS')}</p>
    ${schoolAddressLine ? `<p class="muted">${esc(schoolAddressLine)}</p>` : ''}
  </div>

  <div class="block">
    <p class="block-label">To</p>
    <p class="block-name">${esc(parent.name ?? 'Parent / Guardian')}</p>
    ${parentAddressLine ? `<p class="muted">${esc(parentAddressLine)}</p>` : ''}
  </div>

  <p class="subject"><strong>Subject:</strong> Request for permission — participation of ${esc(student.name)} in "${esc(event.name)}"</p>

  <p class="body-text">Respected Sir/Madam,</p>
  <p class="body-text">${bodyParagraph}</p>
  <p class="closing">Thanking you.</p>

  <div class="sign-block">
    <p class="sign-label">Parent signature:</p>
    ${signatureUrl ? `<img class="sign-image" src="${signatureUrl}" />` : ''}
    <div class="sign-line">${esc(parent.name ?? 'Parent / Guardian')}</div>
  </div>

  <p class="footer">This is a digitally signed, computer-generated permission letter issued by ${esc(school?.name ?? 'School EOS')}.</p>
</body></html>`;
}
