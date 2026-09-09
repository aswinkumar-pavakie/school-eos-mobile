// Principal Library module -- GET /library/overview already grants PRINCIPAL
// the identical access as VICE_PRINCIPAL (library-overview.controller.ts:
// @Roles('LIBRARY', 'ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL')). Principal's web
// app shows exactly this overview and nothing else -- no catalogue browse, no
// member list, no circulation UI (those stay the Library module's own).
// Re-exporting the already-correct VP module rather than duplicating it.

export {
  getLibraryOverview,
  type LibraryActivityRow,
  type LibraryOverview,
} from './vice-principal-library-api';
