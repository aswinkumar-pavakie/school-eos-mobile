// Driver app -- real backend calls only (school-eos-backend's
// src/modules/driver-app), every one going through authedRequest. Types
// match the backend's actual repository row shapes exactly (see
// DriverAppRepository / DriverAppService / MarkBoardingDto). Manual
// attendance fallback for when NFC is unavailable -- never a replacement
// for it. direction ('PICKUP' morning boarding vs 'DROP' afternoon drop-off)
// is explicit everywhere, matching the backend's own real trip/
// bus_boarding_event direction model -- never inferred/hidden.

import { authedRequest } from './auth';
import { formatDate } from './format';

interface ApiEnvelope<T> {
  data: T;
}

// Every driver-app endpoint (my-students, trip start/complete, dashboard) is
// scoped to the current server date only -- there is no date parameter
// anywhere in this module, unlike Faculty's own attendance history. So
// wherever a screen shows "today" it always genuinely means today; this is
// the one shared place that formats it, rather than each screen rolling its
// own. A plain function (not a bare `new Date()` at module scope) so the
// real, necessary date read happens at render/call time, not at import time.
export function todayLabel(): string {
  return `Today, ${formatDate(new Date())}`;
}

export type TripDirection = 'PICKUP' | 'DROP';

export interface DriverProfile {
  id: string;
  personId: string | null;
  fullName: string;
  phone: string | null;
  licenceNo: string;
  licenceExpiry: string;
  policeVerificationRef: string | null;
  verificationExpiry: string | null;
  status: string;
  experienceYears: number | null;
  bloodGroup: string | null;
}

export interface MyBus {
  vehicleId: string;
  registrationNo: string;
  model: string | null;
  capacity: number | null;
  routeId: string;
  routeName: string;
  routeCode: string | null;
  attendantId: string | null;
  attendantName: string | null;
  attendantPhone: string | null;
}

export interface MyStudentRow {
  studentId: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  gradeName: string | null;
  sectionName: string | null;
  routeStopId: string;
  stopName: string;
  sequenceNo: number;
  markedToday: boolean;
  /** 'CARD_TAP' | 'ATTENDANT_MANUAL' | 'DRIVER_MANUAL' | null (unmarked) --
   * only a DRIVER_MANUAL mark is ever eligible for this driver to undo. */
  markedTodaySource: string | null;
}

export interface DriverDashboard {
  profile: DriverProfile;
  bus: MyBus | null;
  trips: Record<TripDirection, { state: string } | null>;
  attendance: Record<TripDirection, { marked: number; total: number }>;
}

// Shared licence/verification-expiry helpers -- used by both the dashboard
// (DriverHome) and My Profile (DriverProfileScreen), kept here once rather
// than duplicated. A plain module-level function (not a bare Date.now() in a
// component body) so the real, necessary date read isn't flagged as an
// impure call during render -- same pattern this codebase's other screens
// already use.
export function daysUntil(dateIso: string): number {
  return Math.ceil((new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function expiryTone(daysLeft: number): 'positive' | 'negative' | 'warning' {
  if (daysLeft < 0) return 'negative';
  if (daysLeft <= 30) return 'warning';
  return 'positive';
}

export function expiryLabel(dateIso: string, daysLeft: number): string {
  const date = new Date(dateIso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (daysLeft < 0) return `${date} · expired`;
  if (daysLeft <= 30) return `${date} · due in ${daysLeft}d`;
  return date;
}

// Shared trip-status presentation -- used by both the Home dashboard and My
// Students, kept here once rather than duplicated, so a driver sees the
// exact same wording and button logic for a trip's state wherever it shows
// up in the app.
export const DIRECTION_LABEL: Record<TripDirection, string> = {
  PICKUP: 'Morning pickup',
  DROP: 'Afternoon drop',
};

export const DIRECTION_HELP: Record<TripDirection, string> = {
  PICKUP: 'Picking students up from their stops and bringing them to school.',
  DROP: 'Taking students from school back to their stops.',
};

// Every real trip.state this can ever show, mapped to what a driver should
// actually understand it to mean -- never the raw backend enum word.
const TRIP_STATUS_TEXT: Record<string, string> = {
  SCHEDULED: 'Not started yet',
  STARTED: 'Trip started',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Trip cancelled',
  INTERRUPTED: 'Trip interrupted',
};

export function tripStatusText(state: string | undefined): string {
  return (state && TRIP_STATUS_TEXT[state]) || 'Not started yet';
}

export function tripTone(state: string | undefined): 'positive' | 'negative' | 'neutral' | 'warning' {
  if (state === 'COMPLETED') return 'positive';
  if (state === 'STARTED' || state === 'IN_PROGRESS') return 'warning';
  if (state === 'CANCELLED' || state === 'INTERRUPTED') return 'negative';
  return 'neutral';
}

// Only two real conditions ever apply: no trip yet (or NFC pre-created one
// that's still SCHEDULED) means Start is the right action; STARTED/
// IN_PROGRESS means Complete is. COMPLETED/CANCELLED/INTERRUPTED are all
// terminal -- no button, just the status shown plainly.
export function tripAction(state: string | undefined): 'start' | 'complete' | null {
  if (state === 'STARTED' || state === 'IN_PROGRESS') return 'complete';
  if (state === 'COMPLETED' || state === 'CANCELLED' || state === 'INTERRUPTED') return null;
  return 'start';
}

// Shared React Query key so Home's dashboard and My Students' trip-status
// card (same GET /driver/dashboard call) read/invalidate the exact same
// cache entry instead of each keeping their own separately-fetched copy.
export const DRIVER_DASHBOARD_KEY = ['driver', 'dashboard'];

export async function getDashboard(): Promise<DriverDashboard> {
  const res = await authedRequest<ApiEnvelope<DriverDashboard>>('/driver/dashboard');
  return res.data;
}

export async function getMyProfile(): Promise<DriverProfile> {
  const res = await authedRequest<ApiEnvelope<DriverProfile>>('/driver/my-profile');
  return res.data;
}

export async function getMyBus(): Promise<MyBus> {
  const res = await authedRequest<ApiEnvelope<MyBus>>('/driver/my-bus');
  return res.data;
}

export async function getMyStudents(direction: TripDirection): Promise<MyStudentRow[]> {
  const res = await authedRequest<ApiEnvelope<MyStudentRow[]>>(
    `/driver/my-students?direction=${direction}`,
  );
  return res.data;
}

export async function markStudents(direction: TripDirection, studentIds: string[]): Promise<{ markedCount: number }> {
  const res = await authedRequest<ApiEnvelope<{ markedCount: number }>>('/driver/boarding', {
    method: 'POST',
    body: { direction, studentIds },
  });
  return res.data;
}

// Undoes a wrongly-marked Present -- only ever the driver's own manual mark,
// from today, for this exact direction (see driver-app.service.ts's
// undoMark() for the full authorization scope). Records a real correction
// server-side (bus_boarding_event itself is append-only) rather than
// pretending to delete anything.
export async function undoMarkPresent(direction: TripDirection, studentId: string): Promise<void> {
  await authedRequest<ApiEnvelope<{ undone: boolean }>>('/driver/boarding/undo', {
    method: 'POST',
    body: { direction, studentId },
  });
}

export async function startTrip(direction: TripDirection): Promise<{ tripId: string; state: string }> {
  const res = await authedRequest<ApiEnvelope<{ tripId: string; state: string }>>(
    `/driver/trip/start?direction=${direction}`,
    { method: 'POST' },
  );
  return res.data;
}

export async function completeTrip(direction: TripDirection): Promise<{ tripId: string; state: string }> {
  const res = await authedRequest<ApiEnvelope<{ tripId: string; state: string }>>(
    `/driver/trip/complete?direction=${direction}`,
    { method: 'POST' },
  );
  return res.data;
}
