# services/ vs features/

This is the single most important boundary in the repo to get right, and the
easiest to get wrong under deadline pressure.

**`src/services` is cross-feature infrastructure.** It knows nothing about
School EOS domains. It answers questions like "how do we make an
authenticated HTTP call," "how do we durably queue a write while offline,"
"where do tokens live" - never "what does marking attendance mean."

**`src/features/<domain>` is where School EOS business logic lives.** API
calls specific to a domain, screens, domain types, validation schemas.

## Concretely

```
GOOD:
  src/features/attendance/api/recordSession.ts   # calls apiRequest('/attendance/sessions', ...)
  src/features/attendance/screens/MarkAttendanceScreen.tsx

BAD:
  src/services/attendanceService.ts               # business logic does not belong in services/
```

A feature's offline-capable write should look like: enqueue a durable
command via `src/services/offline` (generic - it doesn't know what
"attendance" means), then let `src/features/attendance`'s own sync adapter
interpret the outcome according to attendance's rules (e.g. treating
`DUPLICATE` as success). Do not fork the generic queue per feature; do not
teach the generic queue about attendance.

## Rule of thumb

If removing School EOS entirely and shipping this as generic school-EOS-shaped
scaffolding to a different school system would still make the code make
sense, it belongs in `services/`. If it only makes sense in the context of
"marks," "wallet," or "boarding," it belongs in the matching `features/` folder.
