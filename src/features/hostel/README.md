# hostel

Status: not yet implemented.

Hostel Warden's daily operations only: night roll call (offline, reuses
`features/attendance`'s sync pattern), in/out register, outing requests
(overnight routes through an extra Principal approval), emergency gate pass
(issues immediately, retrospective approval required to close), visitors,
mess attendance, hosteller-scoped health/incidents, SOS. Hostel _structure and
bed allocation_ is Admin-web-only and must never be reachable from the
Warden's app, including at the API-authorization layer, not just hidden in UI.

Parent gets a read-only hostel info view for hosteller children (allocation,
outing status, movement history) - keep that read model separate from the
Warden's write-capable screens.

**Source**: HLD §6 ("Warden's request touching a structure/allocation endpoint must be denied by the resolver itself"); API docs v4.0 Phase 7 · Hostel (67 endpoints).
**Roles**: Hostel Warden, Parent (read-only).
