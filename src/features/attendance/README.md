# attendance

Status: not yet implemented.

The offline-capable feature the rest of the offline architecture is modeled
on (see `src/services/offline`). Covers: Faculty class attendance
(online + offline queue), Faculty attendance corrections (Class Advisor
only, append-only - never edits the original record), Faculty own-attendance
manual fallback (goes to `PENDING` until Admin/Principal approval, never a
plain success state), and Hostel Warden's night roll call, which explicitly
reuses this same offline-queue-and-sync pattern rather than its own.

Build the sync adapter here on top of `src/services/offline` (enqueue +
interpret ACCEPTED/DUPLICATE/REJECTED) - do not fork the generic queue.

**Source**: API docs v4.0 Phase 3 · Attendance (14 endpoints: 10 `APP`, 4 `BOTH`/`DEVICE`); LLD v5.1 §Attendance state machine (OPEN → IN_PROGRESS → SUBMITTED → LOCKED).
**Roles**: Faculty, Hostel Warden (night roll call reuses this pattern).
