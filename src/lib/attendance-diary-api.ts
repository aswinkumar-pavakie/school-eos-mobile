// Attendance Diary -- GET /attendance-diary/{context,students,employees,students/:id}.
// Scope (which classes / which employees this login may see) is decided by the BACKEND from the
// caller's own role mappings on every request; this client never widens or narrows it.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface DiaryContext {
  today: string;
  date: string;
  academicYear: { id: string; name: string; startDate: string; endDate: string } | null;
  access: {
    kind: 'FULL' | 'SCOPED';
    role: string;
    roleLabel: string;
    canViewEmployees: boolean;
    profileMode: 'FULL' | 'ATTENDANCE';
    classCount: number;
  };
  grades: { id: string; name: string; levelNo: number; stage: string }[];
  sections: { id: string; gradeId: string; gradeName: string; name: string }[];
  departments: { id: string; name: string }[];
}

export interface DiaryStudentRow {
  studentId: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  rollNo: number | null;
  gradeId: string;
  gradeName: string;
  sectionId: string;
  sectionName: string;
  isHosteller: boolean;
  usesSchoolTransport: boolean;
  dayStatus: string;
  reason: string | null;
  markedAt: string | null;
  totalDays: number;
  presentDays: number;
  percentage: number | null;
}

export interface DiaryEmployeeRow {
  staffId: string;
  personId: string;
  firstName: string;
  lastName: string | null;
  employeeNo: string;
  designation: string | null;
  group: 'PRINCIPAL' | 'VICE_PRINCIPAL' | 'FACULTY';
  departmentName: string | null;
  dayStatus: string;
  eventAt: string | null;
  reason: string | null;
  totalDays: number;
  presentDays: number;
  percentage: number | null;
}

export interface StudentSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  notMarked: number;
  averagePercentage: number | null;
  below75: number;
}
export interface EmployeeSummary {
  total: number;
  present: number;
  absent: number;
  onDuty: number;
  onLeave: number;
  notMarked: number;
  averagePercentage: number | null;
}
export interface DiaryPage<Row, Summary> {
  date: string;
  page: number;
  pageSize: number;
  total: number;
  summary: Summary;
  items: Row[];
}

export interface StudentDiaryParams {
  date?: string;
  q?: string;
  gradeIds?: string[];
  sectionIds?: string[];
  dayStatus?: string;
  percentBand?: string;
  residence?: string;
  transport?: string;
  gender?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}
export interface EmployeeDiaryParams {
  date?: string;
  q?: string;
  group?: string;
  dayStatus?: string;
  percentBand?: string;
  departmentId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface DiaryStudentProfile {
  date: string;
  student: {
    studentId: string;
    firstName: string;
    lastName: string | null;
    admissionNo: string;
    rollNo: number | null;
    gender: string | null;
    sectionId: string;
    sectionName: string;
    gradeId: string;
    gradeName: string;
    isHosteller: boolean;
    usesSchoolTransport: boolean;
  };
  dayStatus: string;
  summary: { totalDays: number; presentDays: number; lateDays: number; absentDays: number; percentage: number | null };
  monthly: { month: string; total: number; present: number; absent: number; late: number }[];
  recent: { date: string; status: string; reason: string | null; markedAt: string | null }[];
}

function qs(values: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function getDiaryContext(date?: string): Promise<DiaryContext> {
  return (await authedRequest<ApiEnvelope<DiaryContext>>(`/attendance-diary/context${qs({ date })}`)).data;
}

export async function getDiaryStudentProfile(studentId: string, date?: string): Promise<DiaryStudentProfile> {
  return (await authedRequest<ApiEnvelope<DiaryStudentProfile>>(`/attendance-diary/students/${studentId}${qs({ date })}`)).data;
}

export async function listDiaryStudents(p: StudentDiaryParams): Promise<DiaryPage<DiaryStudentRow, StudentSummary>> {
  return (
    await authedRequest<ApiEnvelope<DiaryPage<DiaryStudentRow, StudentSummary>>>(
      `/attendance-diary/students${qs({
        date: p.date,
        q: p.q?.trim().slice(0, 60),
        gradeIds: p.gradeIds?.join(','),
        sectionIds: p.sectionIds?.join(','),
        dayStatus: p.dayStatus,
        percentBand: p.percentBand,
        residence: p.residence,
        transport: p.transport,
        gender: p.gender,
        sort: p.sort,
        page: p.page,
        pageSize: p.pageSize,
      })}`,
    )
  ).data;
}

export async function listDiaryEmployees(p: EmployeeDiaryParams): Promise<DiaryPage<DiaryEmployeeRow, EmployeeSummary>> {
  return (
    await authedRequest<ApiEnvelope<DiaryPage<DiaryEmployeeRow, EmployeeSummary>>>(
      `/attendance-diary/employees${qs({
        date: p.date,
        q: p.q?.trim().slice(0, 60),
        group: p.group,
        dayStatus: p.dayStatus,
        percentBand: p.percentBand,
        departmentId: p.departmentId,
        sort: p.sort,
        page: p.page,
        pageSize: p.pageSize,
      })}`,
    )
  ).data;
}
