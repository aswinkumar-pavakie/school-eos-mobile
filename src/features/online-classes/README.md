# online-classes

Status: implemented (Faculty + Parent), backed by `school-eos-backend`'s Online
Classes endpoints. One shared feature for both roles, not separate Faculty/Parent
folders - screens branch on the signed-in user's roles (via `src/hooks/useMe.ts`),
the same way `online-classes.controller.ts` branches server-side.

**Join/Start/Resume are now an in-app LiveKit video call**, not an external Google
Meet hand-off - see the sibling `online-class-call` feature
(`src/features/online-class-call/screens/OnlineClassCallScreen.tsx`) for the actual
call UI, and `POST /online-classes/:id/call-token` for the token-minting endpoint
this feature's screens navigate to (`router.push('/(protected)/online-class-call/:id')`,
same `as never` cast the existing `meeting-call` route already uses for a dynamic
segment the generated typed-routes file doesn't know about). The old
`GET /online-classes/:id/join` endpoint and its `meetingUrl`-based flow no longer
exist on the backend.

The backend remains the sole authorization source. Nothing here decides who is
allowed to do what - `canAttemptJoin()`/status checks in `utils.ts` only pick which
button/label to render; every actual write or join still goes through the real
endpoint and its response is authoritative even if the UI guessed wrong.

## Structure

- `types.ts` - response/request shapes, copied verbatim from the backend's
  `OnlineClassDetail`/`ParentOnlineClassView`.
- `api.ts` - typed wrappers over `authedRequest` (`src/lib/auth.ts`). No separate
  HTTP client. Includes `requestOnlineClassCallToken`/`endOnlineClassCall`/
  `muteOnlineClassParticipant` for the LiveKit call flow.
- `hooks.ts` - TanStack Query hooks (list/detail/schedule/reschedule/cancel/start/
  complete/addRecording), all writes invalidate the `['online-classes']` key. No
  join/call-token hook here - the call screen requests its own token directly on
  mount (same pattern as `meeting-call`'s `MeetingCallScreen`).
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
- **No teacher display name** on the Parent hub cards - the backend has no
  faculty-name field on `ParentOnlineClassView`; the design's card rhythm is kept
  but substituted with real data (grade/section, class date) instead.
- **No screen share on mobile** (Phase 1 scope, matches the website build) - native
  screen share needs ReplayKit (iOS) / a foreground service (Android), real
  additional native config deferred rather than half-built. Roster (with raise-hand
  + faculty mute) and in-call chat ARE built, via `@livekit/react-native`'s
  re-exported `@livekit/components-react` hooks (`useParticipants`, `useChat`).
