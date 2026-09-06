// Backend date/time fields (activityDate, responseDeadline, startTime, endTime) are
// plain date-only / time-only strings, never real Date instants (see the backend's
// own global DATE type-parser convention) -- formatted here by direct string
// manipulation, never via `new Date('YYYY-MM-DD')`, which would silently shift a
// day in some timezones (the exact class of bug already fixed once in this
// project's backend).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** Strips a trailing ':00' seconds component from a Postgres `time` value
 * ('09:00:00' -> '09:00'). */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)}–${formatTime(endTime)}`;
}

/** signedAt/cancelledAt are real timestamptz instants (unlike the date-only
 * fields above) -- a plain Date/toLocaleDateString is safe here. */
export function formatInstantDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDateInput(value: string): boolean {
  return DATE_PATTERN.test(value);
}

export function isValidTimeInput(value: string): boolean {
  return TIME_PATTERN.test(value);
}
