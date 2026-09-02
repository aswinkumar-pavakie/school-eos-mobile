# bulk

Status: reserved, no screens planned for v1 mobile.

Bulk import/export (student records, fee obligations, etc.) is Admin-web-only

- async job pattern (create → validate/dry-run → confirm → execute), never a
  blocking request. Reserved for structural consistency only.

**Source**: API docs v4.0 Phase 10 · Bulk Operations (8 endpoints, all `WEB`).
**Roles**: none - Admin owns this on web.
