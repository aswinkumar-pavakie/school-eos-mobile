// Principal Parents module -- GET /parents and GET /parents/:id already grant
// PRINCIPAL the exact same class-level access as VICE_PRINCIPAL
// (parents.controller.ts: @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'), no
// write methods on this controller at all). Confirmed identical scope for
// both roles by direct backend audit before writing this file -- re-exporting
// the already-correct, already-tested VP module rather than duplicating it.

export {
  listParents,
  getParent,
  type ParentListRow,
  type ParentListParams,
  type LinkedStudentRow,
  type ParentDetail,
} from './vice-principal-parents-api';
