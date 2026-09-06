# academics

Status: mostly reserved, no screens planned for v1 mobile -- with one exception:
`screens/AcademicsHubScreen.tsx` is a real, Parent-only launcher screen (icon grid:
Current term / Timetable / Online class / Calendar), added per explicit design
request. Only the "Online class" tile is functional (routes into
`src/features/online-classes`); the other three render for visual fidelity but show
a "Coming soon" notice, since no backend/module for them exists anywhere in this
project. This does not change the "not a destination screen" guidance below for
anything else in this feature.

Timetable, class/subject/section structure are Admin-web-only. This feature
holds the read-only academic _context_ (today's timetable, current period,
substitution duties) that Faculty's Home/Today screen and Attendance/Marks
screens depend on - keep it as shared types/selectors, not a destination screen.

**Source**: API docs v4.0 Phase 3 · Classes/Teaching Assignments/Timetable (28 endpoints, all `WEB`); frontend workflow doc, Faculty §1.2 "Home / Today Screen".
**Roles**: none directly - consumed internally by Faculty screens.
