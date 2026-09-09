# messaging

Status: implemented (Parent + Faculty), backed entirely by the 6 real
`school-eos-backend` messaging endpoints (`/api/v1/messages/*`). Reached via the
"My class" tab (both roles): the tab lands on `MyClassHubScreen` (an icon-grid hub
matching `AcademicsHubScreen`'s pattern, currently just one real tile — "Message"),
which opens the conversation list. See `app/(protected)/my-class/`.

The conversation list has a role-aware search bar, filtered client-side (no new
endpoint — every conversation already carries the student name and full
participant list): Parent searches by faculty/class-advisor name; Faculty searches
by student/ward name, uniformly across every authorized conversation regardless of
whether they're the subject teacher or class advisor for that section (the list is
never partitioned by role).

## Design adaptations from the reference mockups

- **One shared conversation per ward, not one thread per teacher.** The provided
  design shows separate rows per subject teacher; the backend (confirmed with the
  user before building this) implements one shared conversation per ward
  containing every currently-authorized faculty member (subject teachers + class
  advisor) together — "This is NOT a school-wide group chat" per the backend spec,
  but it is a small shared group, not 1:1. The list/detail screens are role-specific
  rather than showing a generic "+N more" summary: a **Parent** sees the relevant
  teacher (`primaryTeacherContact()` in `utils.ts` — class advisor preferred, else
  the first subject teacher); a **Faculty** sees the ward's name and class/section,
  with the parent's name (`findParentContact()`) shown separately below the header.
- **No "School office" row.** The mockup's list includes a third conversation with
  "School office · Administration" — there is no such feature anywhere in the
  backend (no broadcast/admin conversation concept exists), so it is not
  fabricated here. Only real conversations returned by the API are shown.
- **No per-teacher subject name.** A participant's `role` is only
  `SUBJECT_TEACHER`/`CLASS_ADVISOR`/`PARENT` — the backend doesn't track which
  specific subject a teacher teaches at the conversation-participant level, so the
  UI shows the role label only, never an invented subject name.
- **"Translate" is a header-level convenience over a per-message backend
  endpoint.** The real endpoint translates one message at a time
  (`POST .../messages/:messageId/translate`). Tapping "Translate" in the
  conversation header opens a language picker once, then applies it to every
  currently-loaded message in one batch (looped calls, each independently
  cached server-side). Translated text is shown **alongside** the original in
  each bubble, never replacing it — matches the backend's own "never mutate the
  original message" rule.
- **"Read · delivered" -> "Read" only.** The backend has no way to truthfully
  determine delivery (no realtime/push infrastructure), so only a "Read" marker
  is shown on the viewer's own sent messages, and only when true — never a fake
  "delivered" state.

## Structure

- `types.ts` — response shapes, copied verbatim from the backend's
  `ConversationSummaryDto`/`ConversationDetailDto`/`MessageDto`.
- `api.ts` — typed wrappers over `authedRequest`, matching `api.ts` conventions in
  `online-classes`. `sendMessage` generates a fresh `Idempotency-Key` per call.
- `hooks.ts` — TanStack Query hooks; conversations poll every 15s, an open
  conversation's messages poll every 5s (no realtime infra — see backend README).
- `utils.ts` — `primaryTeacherContact()`/`findParentContact()`, timestamp formatting, role labels.
- `components/` — `Avatar`, `ConversationRow`, `MessageBubble`. Shared
  `SelectField`/`ScreenStates`/`GradientHeader` now live in `src/components/` (moved
  there from `online-classes` when this feature needed them too — features never
  import each other's internals).
- `screens/` — `MyClassHubScreen`, `MessagesListScreen`, `ConversationScreen`.
  Routes under `app/(protected)/my-class/` are thin wrappers
  (`index.tsx` → hub, `messages/index.tsx` → list, `messages/[conversationId].tsx`
  → detail); `my-class/_layout.tsx` is a nested Stack so opening a conversation
  stays inside the "My class" tab (the same cross-tab back-navigation fix applied
  to `academics/online-classes`).
