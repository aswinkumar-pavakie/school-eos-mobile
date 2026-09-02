# health

Status: not yet implemented.

Restricted-scope domain: Faculty (Health In-Charge assignment) and Hostel
Warden (hosteller scope) share this pattern - medication rounds
(GIVEN/MISSED/REFUSED with reason), infirmary visits, sick bay
admission/discharge, standing medication schedules. Parent sees their own
child's data with purpose/scope limits, never comparative or ranked data
(height/weight/BMI must never appear on a student-facing or ranked screen).
Clinical findings are health-staff-only; other roles get operational facts at
most (e.g. "attended", not the note).

**Source**: LLD v5.1 §12.2 (health privacy rules); API docs v4.0 Phase 8 · Health/Infirmary (43 endpoints).
**Roles**: Faculty (Health In-Charge), Hostel Warden (hosteller scope), Parent (own child, restricted).
