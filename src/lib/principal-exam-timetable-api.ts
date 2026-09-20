// Principal Examination Timetable module -- full feature parity with the
// website's own /principal/academics/examination-timetable page, previously
// mobile-missing entirely. Real exam/exam_subject schedule
// (exams.controller.ts, confirmed live @Roles('ADMIN','PRINCIPAL',
// 'CORRESPONDENT','VICE_PRINCIPAL') on every read method this module uses).
// No create/edit/publish/lock controls: all writes stay Admin-only.
// Re-exporting the already-correct VP module rather than duplicating it.

export {
  listExaminations,
  getExamination,
  getExamSchedules,
  type ExamRow,
  type ExamDetail,
  type ExamScheduleRow,
} from './vice-principal-exam-timetable-api';
