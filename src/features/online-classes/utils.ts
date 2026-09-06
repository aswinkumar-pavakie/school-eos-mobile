// Display-only helpers. None of this is an authorization decision -- the backend is
// the sole source of truth for what a user may actually do; these only decide how to
// label/render what the backend already returned.

import type { OnlineClassCommon, OnlineClassStatus } from './types';

export function formatClassDate(scheduledDate: string): string {
  const d = new Date(scheduledDate);
  if (Number.isNaN(d.getTime())) return scheduledDate;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

// startTime/endTime come from the backend as "HH:mm:ss" -- render as "10:00 AM".
export function formatClassTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatClassTimeRange(startTime: string, endTime: string): string {
  return `${formatClassTime(startTime)} - ${formatClassTime(endTime)}`;
}

export const STATUS_LABELS: Record<OnlineClassStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Purely cosmetic tab grouping for the list screen -- mirrors the backend's own
// VIEW_STATUSES mapping (view=upcoming -> DRAFT/SCHEDULED/LIVE, completed ->
// COMPLETED, cancelled -> CANCELLED) so the tab a class appears under always matches
// what ?view= actually returned it under.
export const VIEW_TABS: { key: 'upcoming' | 'completed' | 'cancelled'; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Whether to render an enabled "Join" affordance for THIS user right now. This is a
// UI hint only -- tapping it always calls the real join/detail endpoint and the
// backend's actual response is authoritative regardless of what this function says.
export function canAttemptJoin(item: Pick<OnlineClassCommon, 'status' | 'meetingUrl'>): boolean {
  return (item.status === 'SCHEDULED' || item.status === 'LIVE') && item.meetingUrl !== null;
}

// Mirrors the backend DTOs exactly (ScheduleOnlineClassDto/RescheduleOnlineClassDto,
// time-format.util.ts) -- client-side validation is a UX nicety only, the backend's
// own validation is what actually enforces this.
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDateInput(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function isValidTimeInput(value: string): boolean {
  return TIME_PATTERN.test(value);
}

// scheduledDate arrives as a full ISO datetime (midnight UTC per the backend's DATE
// column) and startTime/endTime as "HH:mm:ss" -- combine them into a real local Date
// for "is this today" / "minutes until start" style UI-only calculations. Never used
// for anything the backend itself decides.
export function classStartDateTime(scheduledDate: string, startTime: string): Date {
  const datePart = scheduledDate.slice(0, 10);
  const [h, m, s] = startTime.split(':').map(Number);
  const d = new Date(datePart);
  d.setHours(h ?? 0, m ?? 0, s ?? 0, 0);
  return d;
}

export function isToday(scheduledDate: string): boolean {
  const d = new Date(scheduledDate.slice(0, 10));
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function minutesUntil(dateTime: Date): number {
  return Math.round((dateTime.getTime() - Date.now()) / 60000);
}
