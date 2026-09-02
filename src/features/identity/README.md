# identity

Status: not yet implemented.

Cross-cutting, read-only person/staff/guardian lookup used by other features
rather than a standalone destination - e.g. Principal's "Lookup" screen
(single search bar across students/staff/classes) and roster lookups that
feed attendance/marks screens.

Do not duplicate student/guardian master-data CRUD here - that's Admin-web-only
(`students`, `admissions` are reserved folders in this repo, not implemented).

**Source**: frontend workflow doc, Principal Mobile §"Lookup"; LLD v5.1 `v_person_visible_student` view.
**Roles**: Principal (lookup); consumed internally by Faculty/Parent/Warden screens.
