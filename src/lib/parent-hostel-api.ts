// Parent-initiated Hostel requests -- real backend calls only
// (school-eos-backend's src/modules/parent/parent-hostel-requests.controller.ts +
// parent-call-requests.controller.ts), every one through authedRequest. Row shapes
// are the exact same OutingRequestRow/CallRequestRow the Warden side already uses
// (verified by reading ParentHostelRequestsService/ParentCallRequestsService --
// both return the same repository rows, just scoped by requestedBy/parentPersonId
// instead of hostelId) -- reused from hostel-warden-api.ts rather than redeclared.
//
// The Warden's own review/decide functions (approve/reject) are deliberately NOT
// re-exported or callable from here -- a parent can create and view their own
// requests, never decide them (that's the Warden's own app surface).

import { authedRequest } from './auth';
import type { CallRequestRow, OutingRequestRow } from './hostel-warden-api';

interface ApiEnvelope<T> {
  data: T;
}

// ---- Gate Pass -----------------------------------------------------------------

export interface CreateGatePassRequestInput {
  studentId: string;
  outFrom: string;
  expectedReturn: string;
  reason: string;
  destination?: string;
  isOvernight?: boolean;
}

export async function listMyGatePassRequests(): Promise<OutingRequestRow[]> {
  const res = await authedRequest<ApiEnvelope<OutingRequestRow[]>>('/parent/hostel/gate-pass-requests');
  return res.data;
}

export async function createGatePassRequest(input: CreateGatePassRequestInput): Promise<OutingRequestRow> {
  const res = await authedRequest<ApiEnvelope<OutingRequestRow>>('/parent/hostel/gate-pass-requests', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

// ---- Emergency Exit --------------------------------------------------------------

export interface CreateEmergencyExitRequestInput {
  studentId: string;
  outFrom: string;
  expectedReturn: string;
  reason: string;
}

export async function listMyEmergencyExitRequests(): Promise<OutingRequestRow[]> {
  const res = await authedRequest<ApiEnvelope<OutingRequestRow[]>>('/parent/hostel/emergency-exit-requests');
  return res.data;
}

export async function createEmergencyExitRequest(input: CreateEmergencyExitRequestInput): Promise<OutingRequestRow> {
  const res = await authedRequest<ApiEnvelope<OutingRequestRow>>('/parent/hostel/emergency-exit-requests', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

// ---- Parent Call Request ---------------------------------------------------------

export interface CreateCallRequestInput {
  studentId: string;
  requestedFrom: string;
  requestedTo: string;
}

export async function listMyCallRequests(): Promise<CallRequestRow[]> {
  const res = await authedRequest<ApiEnvelope<CallRequestRow[]>>('/parent/hostel/call-requests');
  return res.data;
}

export async function createCallRequest(input: CreateCallRequestInput): Promise<CallRequestRow> {
  const res = await authedRequest<ApiEnvelope<CallRequestRow>>('/parent/hostel/call-requests', {
    method: 'POST',
    body: input,
  });
  return res.data;
}
