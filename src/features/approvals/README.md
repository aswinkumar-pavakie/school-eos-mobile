# approvals

Status: not yet implemented.

One shared inbox/action pattern reused across every request type (fee
extensions, hostel outings, staff attendance manual-entry, delegated
requests) rather than a bespoke screen per type - build one generic
approvals list + approve/reject action here, parameterized by request type,
not N separate screens. The backend enforces requester != approver
separation of duties; the client must not assume it can approve its own request.

**Source**: LLD v5.1 §C.3 (SeparationOfDutiesPolicy); API docs v4.0 Phase 10 · Approvals (5 endpoints, all `WEB` per doc - Principal's mobile approvals inbox uses the same underlying engine per the workflow docs, confirm platform tag before building).
**Roles**: Principal (mobile), Vice Principal (delegated), Faculty (leave approval as Class Advisor).
