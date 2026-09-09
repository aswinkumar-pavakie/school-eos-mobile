# online-classes

Status: implemented (Faculty + Parent), backed entirely by the 11 verified
`school-eos-backend` Online Classes endpoints (10 original + `GET
/online-classes/my-subject-offerings`, added for the Schedule form's class/section
picker below). One shared feature for both roles,
not separate Faculty/Parent folders - screens branch on the signed-in user's roles
(via `src/hooks/useMe.ts`), the same way `online-classes.controller.ts` branches
server-side.

The backend remains the sole authorization source. Nothing here decides who is
allowed to do what - `canAttemptJoin()`/status checks in `utils.ts` only pick which
button/label to render; every actual write or join still goes through the real
endpoint and its response is authoritative even if the UI guessed wrong.

## Structure

- `types.ts` - response/request shapes, copied verbatim from the backend's
  `OnlineClassDetail`/`ParentOnlineClassView`/`ParentJoinResult`.
- `api.ts` - typed wrappers over `authedRequest` (`src/lib/auth.ts`). No separate
  HTTP client.
- `hooks.ts` - TanStack Query hooks (list/detail/join/schedule/reschedule/cancel/
  start/complete/addRecording), all writes invalidate the `['online-classes']` key.
- `utils.ts` - display-only formatting and join-eligibility hints.
- `components/` - `OnlineClassCard`, `StatusPill`/`SessionStatusPill`, `PrimaryButton`,
  `SelectField` (a modal-list class/section/subject picker, styled to match this
  feature rather than the OS-native picker), loading/empty/error states.
- `screens/` - two generations of UI live here side by side:
  - **Current, pixel-matched (reached via the Academics tab → Online class):**
    `ParentOnlineClassHubScreen` (Today's sessions/Upcoming/Recordings, real
    join rule with a cosmetic "starts soon" window) and `FacultyOnlineClassHubScreen`
    (same visual language, two in-page tabs - "Today classes" showing the same
    session/recording cards, and "Schedule" holding the class-creation form
    restyled to match). Both use the shared `GradientHeader` component and the
    `accent.blue` color token (`src/lib/theme.ts`), not `colors.primary`.
  - **Original, still-working generic screens (reached via the Home screen's
    "Online Classes" button, kept as a parallel path, not removed):**
    `OnlineClassesListScreen` (tabs: upcoming/completed/cancelled),
    `OnlineClassDetailScreen` (role-branches its action set, and is still where
    Reschedule/Cancel/Add Recording/Complete actually happen from either entry
    point), `ScheduleOnlineClassScreen`, `RescheduleOnlineClassScreen`.
  - Routes under `app/(protected)/online-classes/` are thin wrappers around the
    generic screens; `app/(protected)/academics/online-class.tsx` role-branches
    between the two hub screens.

## Known gaps

- **No native date/time picker.** No date-picker dependency is installed; date/time
  fields are plain text inputs validated client-side against the same `YYYY-MM-DD`/
  `HH:mm` patterns the backend DTOs enforce.
- **Cancel and Add Recording are inline forms** on the detail screen rather than
  separate routes, since each needs only one optional field.
- **No teacher display name or "meeting code"** on the Parent/Faculty hub cards -
  the backend has no faculty-name field on `ParentOnlineClassView` and no short
  code concept at all (only a real Google Meet URL); the design's card rhythm is
  kept but substituted with real data (grade/section, class date) instead.
