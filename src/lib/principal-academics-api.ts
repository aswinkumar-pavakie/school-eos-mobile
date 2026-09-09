// Principal Academics module -- GET /academic-years, /subjects, /mediums,
// /departments all grant PRINCIPAL the identical class-level access as
// VICE_PRINCIPAL (confirmed by direct backend audit: same @Roles line, no
// method-level narrowing either way). Re-exporting the already-correct VP
// module rather than duplicating it.

export {
  listAcademicYears,
  listSubjects,
  listMediums,
  listDepartments,
  type AcademicYear,
  type Subject,
  type Medium,
  type Department,
} from './vice-principal-academics-api';
