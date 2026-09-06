// Money/date formatting for the Parent app -- same real rule as the web app's own
// src/lib/format.ts (paise stored as a digit string, BigInt-safe, Indian digit
// grouping), reimplemented by hand rather than via toLocaleString('en-IN'): Hermes'
// bundled ICU data is not guaranteed identical across every RN/Expo build target,
// and a silently-wrong money display is not an acceptable risk in this module.

function indianGroup(n: number): string {
  const negative = n < 0;
  const digits = Math.abs(Math.trunc(n)).toString();
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree;
  return (negative ? '-' : '') + grouped;
}

/** "₹ 4,42,000" -- Indian grouping, no decimals, for a summary total. */
export function formatMoneySummary(paise: string | number): string {
  const rupees = Math.round(Number(BigInt(paise)) / 100);
  return `₹ ${indianGroup(rupees)}`;
}

/** "₹ 4,42,000.00" -- same grouping, 2 decimal places, for a receipt-style detail line. */
export function formatMoneyDetail(paise: string | number): string {
  const rupees = Number(BigInt(paise)) / 100;
  const whole = Math.trunc(rupees);
  const cents = Math.round((rupees - whole) * 100);
  return `₹ ${indianGroup(whole)}.${Math.abs(cents).toString().padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

/** "15 Sept 2026" -- matches the design reference's date style exactly. */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Jun 2026" for a payment's own date, same style, kept as a distinct name at
 * call sites that specifically mean "when this was paid" for readability. */
export const formatPaidDate = formatDate;

/** "2:30 PM" -- for the Events feature's from/to time display (hand-rolled, same
 * ICU-availability reasoning as the money formatters above). */
export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const hours24 = d.getHours();
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours12}:${minutes} ${period}`;
}

/** "15 Sept 2026, 2:30 PM" */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${formatDate(d)}, ${formatTime(d)}`;
}
