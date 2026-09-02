# home

Status: not yet implemented (`app/(protected)/index.tsx` is a temporary foundation
placeholder proving session/theme/network plumbing - replace it with real routing
into this feature once it exists).

Each mobile role gets its own "what matters right now" landing screen, not a
shared generic dashboard - this is explicit in the source workflow docs:
Faculty's Today screen, Hostel Warden's Today screen, Bus Attendant's Today's
Trip, Parent's Home (one card per child), Principal's mobile summary tiles.

Structure: one `screens/` entry per role (e.g. `FacultyHomeScreen.tsx`,
`ParentHomeScreen.tsx`), selected via the signed-in account's role - see
`src/navigation/capabilities.ts`. Keep role-specific logic here, not in `app/`.

**Roles**: Principal (mobile half), Faculty, Parent, Hostel Warden, Bus Attendant.
