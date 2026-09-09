// Vice Principal Announcements module (Phase 20) -- school-wide, role-targeted
// announcements (announcements.controller.ts), re-exporting the SAME
// listAnnouncements()/AnnouncementRow already used by the VP dashboard
// (Phase 3) -- no duplicate API, no duplicate model.
//
// GET /announcements already grants VICE_PRINCIPAL a method-level override
// (see the controller's own comment) -- no backend change was needed or
// made this phase. Strictly read-only: create() stays ADMIN+PRINCIPAL only,
// archive() stays ADMIN only -- neither is called anywhere in this module,
// and VP does not get either capability just by being able to read the list.
//
// This is the school-wide Announcements module, distinct from
// community_announcement (a single community's own posts, Phase 19's
// Communities module) -- not a duplicate, no cross-module boundary crossed.
//
// There is no GET /announcements/:id endpoint -- the list endpoint already
// returns each announcement's full title/body/audiences (no pagination, no
// truncation), so the detail screen re-reads the same already-authorized
// list data (fetched once, including archived so a deep link into an
// archived announcement still resolves) rather than inventing a new
// backend endpoint that doesn't exist.

export {
  listAnnouncements,
  type AnnouncementAudience,
  type AnnouncementListParams,
  type AnnouncementRow,
} from './vice-principal-dashboard-api';
