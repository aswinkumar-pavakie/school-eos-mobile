// Employee Attendance -- real backend calls only (faculty/my-attendance
// controller). Read-only self-service, no punch-in/out actions.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface MyAttendanceDay {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_DUTY' | null;
  punchIn: string | null;
  punchOut: string | null;
  hoursWorked: number | null;
}

export interface MyAttendanceSummary {
  today: MyAttendanceDay | null;
  summary: { ratePercent: number | null; presentCount: number; absentCount: number; onDutyCount: number; workingDays: number };
  days: MyAttendanceDay[];
}

export async function getMyAttendance(month?: string): Promise<MyAttendanceSummary> {
  const qs = month ? `?month=${month}` : '';
  const res = await authedRequest<ApiEnvelope<MyAttendanceSummary>>(`/faculty/my-attendance${qs}`);
  return res.data;
}
