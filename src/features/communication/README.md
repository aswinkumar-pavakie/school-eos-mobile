# communication

Status: not yet implemented.

Notices/announcements (compose is shared across roles that can send them -
Admin, Principal; Faculty posts to their class/subject community), Parent's
notification inbox (grouped by child then date, channel + quiet-hours
preferences). Uses `src/services/notifications` for push token/routing
infrastructure - do not reimplement notification delivery here.

**Source**: API docs v4.0 (Communication/Notifications/Documents/Evidence, 10 endpoints per Feature Index - note the header/table mismatch flagged in the source audit, see `docs/api/gaps.md`).
**Roles**: all mobile roles (varying send/receive capability).
