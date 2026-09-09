// Parent app's Fees feature -- real backend calls only (school-eos-backend's
// src/modules/parent), every one going through authedRequest so a stale/expired
// access token is silently refreshed first. No mock/placeholder data anywhere in
// this file -- an empty or loading state is a real "nothing yet", never a filled-in
// fake example.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ParentChild {
  studentId: string;
  studentName: string;
  gradeName: string | null;
  sectionName: string | null;
  mediumName: string | null;
  rollNo: string | null;
  relationship: string;
  isPrimaryContact: boolean;
  accessLevel: 'FULL' | 'VIEW_ONLY' | 'NO_FINANCE';
}

export async function listChildren(): Promise<ParentChild[]> {
  const res = await authedRequest<ApiEnvelope<ParentChild[]>>('/parent/children');
  return res.data;
}

export interface FeeTerm {
  academicYearId: string;
  academicYearName: string;
  instalmentNo: number;
  label: string;
}

export async function listFeeTerms(studentId: string): Promise<FeeTerm[]> {
  const res = await authedRequest<ApiEnvelope<FeeTerm[]>>(`/parent/students/${studentId}/fee-terms`);
  return res.data;
}

export type FeeLineState = 'PENDING' | 'PARTIAL' | 'PAID' | 'WAIVED' | 'OVERDUE' | 'CANCELLED';

export interface FeeLine {
  feeDemandId: string;
  feeHeadName: string;
  amountPaise: string;
  lateFeePaise: string;
  paidPaise: string;
  outstandingPaise: string;
  dueDate: string;
  state: FeeLineState;
}

export interface FeeSummary {
  canPay: boolean;
  totalPayablePaise: string;
  paidPaise: string;
  outstandingPaise: string;
  lines: FeeLine[];
}

export async function getFeeSummary(studentId: string, academicYearId: string, instalmentNo: number): Promise<FeeSummary> {
  const qs = new URLSearchParams({ academicYearId, instalmentNo: String(instalmentNo) });
  const res = await authedRequest<ApiEnvelope<FeeSummary>>(`/parent/students/${studentId}/fees?${qs.toString()}`);
  return res.data;
}

export interface RazorpayOrderResult {
  paymentId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountPaise: string;
  schoolName: string;
}

export async function createRazorpayOrder(
  studentId: string,
  input: { academicYearId: string; instalmentNo: number; feeDemandIds: string[]; amountPaise: string },
): Promise<RazorpayOrderResult> {
  const res = await authedRequest<ApiEnvelope<RazorpayOrderResult>>(`/parent/students/${studentId}/fees/razorpay-order`, {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export type PaymentState = 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'RECONCILED' | 'REVERSED';
export type PaymentMode = 'UPI' | 'CARD' | 'NETBANKING' | 'CASH' | 'CHEQUE' | 'DD' | 'WALLET_TOPUP';

export interface PaymentHistoryItem {
  id: string;
  amountPaise: string;
  mode: PaymentMode;
  gateway: string | null;
  gatewayRef: string | null;
  state: PaymentState;
  initiatedAt: string;
  confirmedAt: string | null;
  receiptId: string | null;
  receiptNo: string | null;
  receiptCount: number;
}

export async function listPayments(studentId: string): Promise<PaymentHistoryItem[]> {
  const res = await authedRequest<ApiEnvelope<PaymentHistoryItem[]>>(`/parent/students/${studentId}/payments`);
  return res.data;
}

export interface ReceiptLineItem {
  feeHeadId: string | null;
  feeHeadName: string | null;
  instalmentNo: number;
  amountPaise: string;
}

export interface ReceiptDetail {
  receipt: {
    id: string;
    receiptNo: string;
    financialYear: string;
    amountPaise: string;
    issuedOn: string;
  };
  payment: {
    mode: PaymentMode;
    gateway: string | null;
    gatewayRef: string | null;
    initiatedAt: string;
    confirmedAt: string | null;
  };
  student: {
    displayName: string;
    admissionNo: string;
    gradeName: string | null;
    sectionName: string | null;
  } | null;
  lineItems: ReceiptLineItem[];
  school: {
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    board: string | null;
    recognitionNo: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  } | null;
}

export async function getReceipt(receiptId: string): Promise<ReceiptDetail> {
  const res = await authedRequest<ApiEnvelope<ReceiptDetail>>(`/parent/receipts/${receiptId}`);
  return res.data;
}

// ============================================================
// Announcements (Home feed + Notices) -- real school-eos-backend/src/modules/
// parent/parent-academic.controller.ts's own `announcements` route, scoped to
// the selected child's own current section.
// ============================================================

export interface ParentAnnouncement {
  id: string;
  title: string;
  body: string;
  category: string | null;
  priority: string;
  isEmergency: boolean;
  createdAt: string;
}

export async function listAnnouncements(studentId: string): Promise<ParentAnnouncement[]> {
  const res = await authedRequest<ApiEnvelope<ParentAnnouncement[]>>(`/parent/students/${studentId}/announcements`);
  return res.data;
}

// ============================================================
// Academics -- Attendance, Report Card (Results), Exams, Subjects, Current
// Term (+ Subject Detail), Timetable, Calendar. Real parent-academic.controller.ts.
// ============================================================

export interface AttendanceDay {
  date: string;
  status: string;
}

export interface AttendanceSummary {
  presentCount: number;
  totalCount: number;
  percentage: number;
}

export async function getAttendance(studentId: string, month?: string): Promise<{ summary: AttendanceSummary; days: AttendanceDay[] }> {
  const qs = month ? `?month=${month}` : '';
  const res = await authedRequest<ApiEnvelope<{ summary: AttendanceSummary; days: AttendanceDay[] }>>(
    `/parent/students/${studentId}/attendance${qs}`,
  );
  return res.data;
}

export interface ResultsExam {
  examId: string;
  examName: string;
  examType: string;
  term: string | null;
}

export async function listResultExams(studentId: string): Promise<ResultsExam[]> {
  const res = await authedRequest<ApiEnvelope<ResultsExam[]>>(`/parent/students/${studentId}/results/exams`);
  return res.data;
}

export interface ResultSubjectRow {
  subjectName: string;
  maxMarks: number;
  marksObtained: number | null;
  isAbsent: boolean;
}

export interface ResultDetail {
  subjects: ResultSubjectRow[];
  totalObtained: number;
  totalMax: number;
  percent: number | null;
}

export async function getResults(studentId: string, examId: string): Promise<ResultDetail> {
  const res = await authedRequest<ApiEnvelope<ResultDetail>>(`/parent/students/${studentId}/results/exams/${examId}`);
  return res.data;
}

export interface ExamScheduleRow {
  examSubjectId: string;
  examName: string;
  subjectName: string;
  examDate: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  room: string | null;
  maxMarks: number;
}

export async function getExamSchedule(studentId: string): Promise<ExamScheduleRow[]> {
  const res = await authedRequest<ApiEnvelope<ExamScheduleRow[]>>(`/parent/students/${studentId}/exams`);
  return res.data;
}

export interface ParentSubject {
  subjectOfferingId: string;
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  weeklyPeriods: number | null;
  syllabusProgressPercent: number;
}

export async function listSubjects(studentId: string): Promise<ParentSubject[]> {
  const res = await authedRequest<ApiEnvelope<ParentSubject[]>>(`/parent/students/${studentId}/subjects`);
  return res.data;
}

export interface CurrentTermSubject {
  subjectOfferingId: string;
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  weeklyPeriods: number | null;
}

export async function listCurrentTerm(studentId: string): Promise<CurrentTermSubject[]> {
  const res = await authedRequest<ApiEnvelope<CurrentTermSubject[]>>(`/parent/students/${studentId}/term`);
  return res.data;
}

export interface SubjectFolder {
  id: string;
  title: string;
  description: string | null;
  fileCount: number;
}

export interface LessonPlan {
  id: string;
  title: string;
  content: string | null;
  weekStart: string | null;
}

export interface SubjectDetail {
  offering: CurrentTermSubject;
  folders: SubjectFolder[];
  lessonPlans: LessonPlan[];
}

export async function getSubjectDetail(studentId: string, subjectOfferingId: string): Promise<SubjectDetail> {
  const res = await authedRequest<ApiEnvelope<SubjectDetail>>(`/parent/students/${studentId}/term/subjects/${subjectOfferingId}`);
  return res.data;
}

export interface SubjectFile {
  id: string;
  fileName: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export async function getFolderFiles(studentId: string, subjectOfferingId: string, folderId: string): Promise<SubjectFile[]> {
  const res = await authedRequest<ApiEnvelope<SubjectFile[]>>(
    `/parent/students/${studentId}/term/subjects/${subjectOfferingId}/folders/${folderId}`,
  );
  return res.data;
}

export async function getSubjectFileUrl(studentId: string, subjectOfferingId: string, fileId: string): Promise<string> {
  const res = await authedRequest<ApiEnvelope<{ url: string }>>(
    `/parent/students/${studentId}/term/subjects/${subjectOfferingId}/files/${fileId}/url`,
  );
  return res.data.url;
}

export interface TimetablePeriod {
  periodId: string;
  periodNo: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface TimetableSlot {
  slotId: string;
  periodId: string;
  periodNo: number;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  room: string | null;
  subjectName: string;
  teacherName: string | null;
}

export async function getTimetable(studentId: string): Promise<{ periods: TimetablePeriod[]; slots: TimetableSlot[] }> {
  const res = await authedRequest<ApiEnvelope<{ periods: TimetablePeriod[]; slots: TimetableSlot[] }>>(
    `/parent/students/${studentId}/timetable`,
  );
  return res.data;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  isHoliday: boolean;
  startDate: string;
  endDate: string;
  scopeType: string;
  scopeStage: string | null;
}

export async function getCalendar(studentId: string): Promise<CalendarEvent[]> {
  const res = await authedRequest<ApiEnvelope<CalendarEvent[]>>(`/parent/students/${studentId}/calendar`);
  return res.data;
}

// ============================================================
// Homework -- list, submit (with file upload + note), and open a submitted
// file back. Real parent-homework.controller.ts.
// ============================================================

export interface ParentHomework {
  id: string;
  subjectOfferingId: string;
  subjectName: string;
  title: string;
  description: string | null;
  attachmentKeys: string[] | null;
  assignedOn: string;
  dueDate: string;
  maxMarks: number | null;
  submissionStatus: 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'NOT_DONE';
  submittedAt: string | null;
  isLate: boolean;
  objectKeys: string[] | null;
  note: string | null;
  marksAwarded: number | null;
  feedback: string | null;
}

export async function listHomework(studentId: string): Promise<ParentHomework[]> {
  const res = await authedRequest<ApiEnvelope<ParentHomework[]>>(`/parent/students/${studentId}/homework`);
  return res.data;
}

/** Multipart upload via authedRequest (real token-refresh + clean ApiError
 * messages, same as every other call in this file) -- `apiRequest` already
 * knows to leave Content-Type unset for a FormData body so fetch can set its
 * own multipart boundary. `files` may be empty (a "mark completed" submit
 * with no attachment is valid).
 *
 * IMPORTANT: Expo's fetch/FormData implementation (which replaces RN's
 * built-in one) does NOT support the classic RN `{ uri, name, type }`
 * file-part object -- it only accepts a real Blob/File instance, or it
 * throws "Unsupported FormDataPart implementation". So each picked file is
 * first read into a real Blob (with its mime type set explicitly, since a
 * local file:// fetch doesn't reliably report the right Content-Type on its
 * own) before being appended. */
async function toUploadableBlob(file: { uri: string; mimeType: string }): Promise<Blob> {
  const bytes = await (await fetch(file.uri)).arrayBuffer();
  return new Blob([bytes], { type: file.mimeType });
}

export async function submitHomework(
  studentId: string,
  homeworkId: string,
  input: { note?: string; files?: { uri: string; name: string; mimeType: string }[] },
): Promise<ParentHomework> {
  const form = new FormData();
  if (input.note) form.append('note', input.note);
  for (const file of input.files ?? []) {
    const blob = await toUploadableBlob(file);
    form.append('files', blob, file.name);
  }
  const res = await authedRequest<ApiEnvelope<ParentHomework>>(
    `/parent/students/${studentId}/homework/${homeworkId}/submit`,
    { method: 'POST', body: form },
  );
  return res.data;
}

export async function getHomeworkFileUrl(studentId: string, homeworkId: string, objectKey: string): Promise<string> {
  const qs = new URLSearchParams({ key: objectKey });
  const res = await authedRequest<ApiEnvelope<{ url: string }>>(
    `/parent/students/${studentId}/homework/${homeworkId}/file-url?${qs.toString()}`,
  );
  return res.data.url;
}

// ============================================================
// Library -- real parent-library.controller.ts. Reuses the school Library
// module's own book/circulation shapes as-is.
// ============================================================

export interface LibraryIssueRow {
  id: string;
  bookId: string;
  bookTitle: string;
  copyCode: string;
  issuedAt: string;
  dueDate: string;
  returnedAt: string | null;
  renewedCount: number;
  status: string;
  isOverdue: boolean;
  daysOverdue: number;
  projectedFinePaise: string;
}

export interface LibrarySummary {
  hasLibraryCard: boolean;
  member?: { id: string; maxBooksAllowed: number; status: string };
  stats: { issuedCount: number; dueSoonCount: number; pendingFinePaise: string };
  borrowed: LibraryIssueRow[];
  history: LibraryIssueRow[];
}

export async function getLibrarySummary(studentId: string): Promise<LibrarySummary> {
  const res = await authedRequest<ApiEnvelope<LibrarySummary>>(`/parent/students/${studentId}/library/summary`);
  return res.data;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  categoryName: string | null;
  coverImageUrl: string | null;
  copiesSummary: { total: number; available: number; issued: number };
}

export async function searchLibraryCatalog(studentId: string, search?: string): Promise<{ data: LibraryBook[] }> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return authedRequest<{ data: LibraryBook[] }>(`/parent/students/${studentId}/library/books${qs}`);
}

// ============================================================
// Health -- real parent-health.controller.ts, read-only.
// ============================================================

export interface HealthProfile {
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  measuredOn: string | null;
  familyDoctor: string | null;
  doctorPhone: string | null;
  insuranceRef: string | null;
  notes: string | null;
}

export interface InfirmaryVisit {
  id: string;
  visitedAt: string;
  complaint: string;
  vitals: Record<string, unknown> | null;
  observation: string | null;
  action: string;
  outcome: string | null;
  attendedByName: string;
  parentNotifiedAt: string | null;
}

export async function getHealthOverview(studentId: string): Promise<{ profile: HealthProfile | null; visits: InfirmaryVisit[] }> {
  const res = await authedRequest<ApiEnvelope<{ profile: HealthProfile | null; visits: InfirmaryVisit[] }>>(
    `/parent/students/${studentId}/health`,
  );
  return res.data;
}

// ============================================================
// Feedback -- real parent-feedback.controller.ts. One rating per subject,
// no aggregation/anonymity view built (out of scope, Parent-only sees their
// own submitted rating).
// ============================================================

export interface FeedbackSubject {
  subjectOfferingId: string;
  subjectName: string;
  teacherName: string | null;
  myRating: number | null;
}

export async function listFeedbackSubjects(studentId: string): Promise<FeedbackSubject[]> {
  const res = await authedRequest<ApiEnvelope<FeedbackSubject[]>>(`/parent/students/${studentId}/feedback`);
  return res.data;
}

export async function submitFeedback(studentId: string, subjectOfferingId: string, rating: number): Promise<FeedbackSubject[]> {
  const res = await authedRequest<ApiEnvelope<FeedbackSubject[]>>(`/parent/students/${studentId}/feedback`, {
    method: 'POST',
    body: { subjectOfferingId, rating },
  });
  return res.data;
}

// ============================================================
// Documents (Certificates) -- real parent-documents.controller.ts.
// ============================================================

export const DOCUMENT_TYPES = [
  'BONAFIDE_CERTIFICATE',
  'TRANSFER_CERTIFICATE',
  'CHARACTER_CERTIFICATE',
  'STUDY_CERTIFICATE',
  'FEE_STRUCTURE_CERTIFICATE',
  'MIGRATION_CERTIFICATE',
  'DUPLICATE_MARKSHEET',
  'CONDUCT_CERTIFICATE',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface DocumentRequest {
  id: string;
  docType: DocumentType;
  reason: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  documentObjectKey: string | null;
  documentFileName: string | null;
}

export async function listDocumentRequests(studentId: string): Promise<DocumentRequest[]> {
  const res = await authedRequest<ApiEnvelope<DocumentRequest[]>>(`/parent/students/${studentId}/documents`);
  return res.data;
}

export async function createDocumentRequest(studentId: string, docType: DocumentType, reason: string): Promise<DocumentRequest> {
  const res = await authedRequest<ApiEnvelope<DocumentRequest>>(`/parent/students/${studentId}/documents`, {
    method: 'POST',
    body: { docType, reason },
  });
  return res.data;
}

export async function getDocumentDownloadUrl(studentId: string, requestId: string): Promise<string> {
  const res = await authedRequest<ApiEnvelope<{ url: string }>>(`/parent/students/${studentId}/documents/${requestId}/download-url`);
  return res.data.url;
}

// ============================================================
// Bus -- real parent-bus.controller.ts. Display only, no GPS.
// ============================================================

export interface BusStop {
  stopName: string;
  sequenceNo: number;
  scheduledTime: string | null;
}

export interface BusAllocation {
  direction: string;
  stopName: string;
  scheduledTime: string | null;
  routeId: string;
  routeName: string;
  routeCode: string | null;
  vehicleId: string | null;
  registrationNo: string | null;
  model: string | null;
  driverName: string | null;
  driverPhone: string | null;
  attendantName: string | null;
  attendantPhone: string | null;
  stops: BusStop[];
}

export async function getBusAllocation(studentId: string): Promise<BusAllocation | null> {
  const res = await authedRequest<ApiEnvelope<BusAllocation | null>>(`/parent/students/${studentId}/bus`);
  return res.data;
}

// ============================================================
// Profile -- real parent-academic.controller.ts `profile` route.
// ============================================================

export interface StudentProfile {
  firstName: string;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  photoUrl: string | null;
  admissionNo: string;
  bloodGroup: string | null;
  gradeName: string | null;
  sectionName: string | null;
  mediumName: string | null;
  rollNo: number | null;
}

export async function getStudentProfile(studentId: string): Promise<StudentProfile> {
  const res = await authedRequest<ApiEnvelope<StudentProfile>>(`/parent/students/${studentId}/profile`);
  return res.data;
}

// ============================================================
// Leave requests -- real parent-leave.controller.ts. Attachment fields exist on
// the backend DTO but this app never sends them (no storage bucket wired for
// leave attachments yet -- see the Leave screen's own comment for why).
// ============================================================

export interface StudentLeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: number | null;
  gradeName: string | null;
  sectionName: string | null;
  fromDate: string;
  toDate: string;
  reason: string;
  skipSchoolTransport: boolean;
  attachmentFileName: string | null;
  attachmentObjectKey: string | null;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  approvalRequestId: string | null;
}

export async function listLeaveRequests(studentId: string): Promise<StudentLeaveRequest[]> {
  const res = await authedRequest<ApiEnvelope<StudentLeaveRequest[]>>(`/parent/student-leave-requests?studentId=${studentId}`);
  return res.data;
}

export async function createLeaveRequest(input: {
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  skipSchoolTransport?: boolean;
}): Promise<StudentLeaveRequest> {
  const res = await authedRequest<ApiEnvelope<StudentLeaveRequest>>('/parent/student-leave-requests', {
    method: 'POST',
    body: input,
  });
  return res.data;
}
