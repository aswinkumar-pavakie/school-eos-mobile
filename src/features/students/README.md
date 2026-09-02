# students

Status: reserved, no screens planned for v1 mobile.

Student record creation, editing, bulk import, section/medium transfer,
sibling linking and document upload are Admin-web-only per the HLD's
feature-to-technology map and every workflow document. This folder exists so
read-only student-context surfaces consumed by mobile features (a roster row,
a profile summary card) have a clear home if/when they need shared
types/selectors, rather than being duplicated per feature.

**Source**: HLD §2 (feature-to-technology map: "Student and staff records | Next.js | NestJS"); API docs v4.0 Phase 2 (33 endpoints, all `WEB`).
**Roles**: none directly - Admin owns this on web.
