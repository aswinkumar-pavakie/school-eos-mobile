// Bus -- real backend calls only (faculty/bus controller). Display only, no
// GPS/live location (explicit instruction). A real "not assigned" (null) is
// honest, not an error.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface StaffBusAssignment {
  role: 'DRIVER' | 'ATTENDANT';
  vehicleId: string;
  registrationNo: string;
  model: string | null;
  capacity: number;
  routeId: string;
  routeName: string;
  routeCode: string | null;
  direction: string;
  stops: { stopName: string; sequenceNo: number; scheduledTime: string | null }[];
}

export async function getMyBusAssignment(): Promise<StaffBusAssignment | null> {
  const res = await authedRequest<ApiEnvelope<StaffBusAssignment | null>>('/faculty/bus');
  return res.data;
}
