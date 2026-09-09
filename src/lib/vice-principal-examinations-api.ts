// Vice Principal Examinations module (Phase 11) -- reuses every existing API
// client already built rather than duplicating: listExaminations/ExamRow
// (Phase 3, now filter-capable), getExamination/ExamDetail and
// getExamSchedules/ExamScheduleRow (Phase 10), listAcademicYears (Phase 8).
// No new backend endpoint was needed for this phase at all -- every route
// this module calls was already authorized for VICE_PRINCIPAL by a prior
// phase. No results/marks UI is built here: this backend has no dedicated
// Marks/Results controller or model at all (confirmed by inspection before
// writing any code), so per this phase's own explicit instruction ("do NOT
// create a new marks model/result calculation engine"), none was invented.
// The exam's own real state enum (DRAFT/SCHEDULED/CONDUCTED/MARKS_ENTRY/
// VERIFIED/PUBLISHED/LOCKED) and its real marksEntryOpensAt/ClosesAt window
// are the only "examination status/monitoring" fields that actually exist,
// and both are already present on ExamDetail below.

import { getExamSchedules } from './vice-principal-exam-timetable-api';

export { listExaminations, type ExamRow } from './vice-principal-dashboard-api';
export { getExamination, getExamSchedules, type ExamDetail, type ExamScheduleRow } from './vice-principal-exam-timetable-api';
export { listAcademicYears, type AcademicYear } from './vice-principal-academics-api';

export interface ExamCoverage {
  classes: string[];
  subjects: string[];
}

/** Distinct grade+section and subject names covered by this exam's real
 * schedule -- "applicable classes/sections... subjects" per this phase's own
 * Examination Detail requirement, derived from the same real data Phase 10's
 * Examination Timetable already uses, not a second fetch of new data. */
export async function getExamCoverage(examId: string): Promise<ExamCoverage> {
  const schedules = await getExamSchedules(examId);
  const classes = Array.from(new Set(schedules.map((s) => `${s.gradeName} ${s.sectionName}`)));
  const subjects = Array.from(new Set(schedules.map((s) => s.subjectName)));
  return { classes, subjects };
}
