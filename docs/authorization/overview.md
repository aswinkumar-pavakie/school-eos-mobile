# Authorization

**The backend is the authorization boundary, always.** Everything in this
document (and in `src/navigation/capabilities.ts`) is a UX/navigation
convenience - which tab renders, which button shows - never a security
control. Hiding a button does not mean the backend denies the equivalent
request; a denied request must be denied by the backend regardless of what
the client renders.

## Role model (source-audit reconciled)

Nine backend login roles exist; only some have a surface in this app:

| Role               | Mobile surface here?                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Admin              | No - web only                                                                                         |
| Principal          | **Yes** - mobile half (approvals, SOS, live bus map, announcements, lookup), alongside a full web app |
| Vice Principal     | No - web only                                                                                         |
| Finance / Accounts | No - web only                                                                                         |
| Faculty            | **Yes** - mobile-only, always                                                                         |
| Parent             | **Yes** - mobile-only, no web version exists                                                          |
| Hostel Warden      | **Yes** - mobile-only, daily operations only                                                          |
| Bus Attendant      | **Yes** - mobile, device-scoped                                                                       |
| Canteen Vendor     | No - separate native Kotlin terminal product, not this app                                            |

Faculty additionally carries zero or more **assignments** (not separate
roles/logins): `CLASS_ADVISOR`, `ACADEMIC_COORDINATOR`, `HEALTH_IN_CHARGE`,
`COMMUNITY_IN_CHARGE`, `SPORTS_FACULTY`. None of them ever unlock web
access. Holding one assignment never implies another - notably, an ordinary
Physical Training subject-teacher assignment is fully independent of the
`SPORTS_FACULTY` assignment (LLD v5.1 §1.4, acceptance invariant #31).

See `src/constants/roles.ts` for the enforced, closed set.

## Reconciliation history (why the model above, not the HLD's literal text)

Three contradictions surfaced while reading the HLD, LLD v5.1, API docs
v4.0, and the login-by-login workflow docs against each other. All three
were confirmed with the product owner before this scaffold was built:

1. **"Sports Manager"** appears once in the HLD's summary role count, never
   again in its body. Three independent, more detailed, more recent
   documents (LLD v5.1, API docs v4.0, both workflow docs) unanimously state
   it was removed and replaced by the `SPORTS_FACULTY` Faculty assignment.
   Treated as a stale HLD line.
2. **Canteen Vendor** is tagged `📱 APP` in the API docs' platform legend and
   described with full Expo-style screens in the workflow docs, but the HLD
   gives an explicit hardware rationale (SAM module, DESFire APDU timing)
   for why the canteen/bus terminal must be native Kotlin, and the working
   brief for this repo separately confirms the native terminal is a distinct
   product surface. Canteen Vendor is excluded from this repo.
3. **Principal's mobile half** is absent from the HLD's terse stack table
   (which lists only Faculty/Hostel Warden/Bus Attendant for "Staff mobile
   app") but is written out in full, independently, in both workflow docs
   ("previously only referenced, never written out"). Included.

## Capability model

`src/navigation/capabilities.ts` provides `hasRole`, `hasAssignment`,
`hasAnyRole` - pure functions over the signed-in account's roles/assignments
from `GET /me`. **Deny by default**: an account matching nothing has no
capabilities. Extend this file as features need finer-grained UX decisions,
but keep the enforcement itself server-side.
