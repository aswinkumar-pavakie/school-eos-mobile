# sports

Status: not yet implemented.

Sports Faculty is an **assignment on the Faculty login, not a role** (the
former "Sports Manager" role was removed - see `docs/authorization/overview.md`
for the reconciliation). Operations (teams, rosters, trials, training,
fixtures, results, achievements, equipment issue/return, facility bookings)
are object-scoped to the sport(s)/team(s) the assignment covers and belong
here. Sports _structure and equipment master data_ (defining sports,
facilities, the equipment master, coach assignment) is Admin-web-only -
do not build those screens in this feature; this app only ever reads that
master data (e.g. a read-only facility list when booking a slot).

PT (Physical Training) as an ordinary timetabled subject is independent of
this assignment - it uses the plain `features/attendance` flow like any other
subject. Holding one never grants the other.

**Source**: LLD v5.1 §1.4 (PT vs. Sports Faculty invariant #31); API docs v4.0 Phase 4 · Sports (61 endpoints: Admin/`WEB` structure, Sports Faculty/`APP` operations, shared `BOTH` reads).
**Roles**: Faculty (Sports Faculty assignment); shared reads available more broadly.
