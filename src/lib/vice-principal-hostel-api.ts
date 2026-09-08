// Vice Principal Hostel module (Phase 14) -- every call here hits a REAL,
// pre-existing backend endpoint (hostels/hostel-blocks/hostel-floors/
// hostel-rooms/hostel-allocations controllers), each newly (and minimally)
// broadened to also allow VICE_PRINCIPAL -- see each controller's own
// comment. No new backend service, no duplicated model.
//
// Deliberately excludes hostel-rooms' own listBeds sub-resource -- per-bed
// browsing isn't needed for oversight: HostelRoomRow already carries
// bedCapacity per room, and real occupancy is computed from the real
// hostel-allocations list (filtered client-side by hostelName, since
// HostelAllocationQueryDto has no hostelId param), so occupied/available
// beds are derived from two data points this module already fetches, not a
// third fetch layer -- matches this phase's own "avoid unnecessary UI
// complexity" instruction.
//
// No hostel attendance/leave/visitor data exists anywhere in this backend
// (confirmed by inspection -- src/modules/hostel/ has exactly these 5
// structural/allocation controllers, nothing else; gate-pass/emergency-exit/
// call/visitor features live under the Requests & Approvals domain, a
// separate module this phase's own instructions explicitly exclude). None
// of that was built or invented here.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface HostelRow {
  id: string;
  name: string;
  gender: string;
  wardenStaffId: string | null;
  capacity: number | null;
  status: string;
}

export async function listHostels(): Promise<HostelRow[]> {
  const res = await authedRequest<ApiEnvelope<HostelRow[]>>('/hostels');
  return res.data;
}

export async function getHostel(id: string): Promise<HostelRow> {
  const res = await authedRequest<ApiEnvelope<HostelRow>>(`/hostels/${id}`);
  return res.data;
}

export interface HostelBlockRow {
  id: string;
  hostelId: string;
  name: string;
}

export async function listBlocks(hostelId: string): Promise<HostelBlockRow[]> {
  const res = await authedRequest<ApiEnvelope<HostelBlockRow[]>>(`/hostels/${hostelId}/blocks`);
  return res.data;
}

export interface HostelFloorRow {
  id: string;
  blockId: string;
  floorNo: number;
}

export async function listFloors(blockId: string): Promise<HostelFloorRow[]> {
  const res = await authedRequest<ApiEnvelope<HostelFloorRow[]>>(`/hostel-blocks/${blockId}/floors`);
  return res.data;
}

export interface HostelRoomRow {
  id: string;
  floorId: string;
  roomNo: string;
  roomType: string | null;
  bedCapacity: number;
  status: string;
}

export async function listRooms(floorId: string): Promise<HostelRoomRow[]> {
  const res = await authedRequest<ApiEnvelope<HostelRoomRow[]>>(`/hostel-floors/${floorId}/rooms`);
  return res.data;
}

export interface HostelAllocationRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  admissionNo: string;
  bedNo: string;
  roomNo: string;
  hostelName: string;
  allocatedFrom: string;
  status: string;
}

export async function listAllocations(params: {
  status?: string;
  academicYearId?: string;
}): Promise<HostelAllocationRow[]> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  const qs = query.toString();
  const res = await authedRequest<ApiEnvelope<HostelAllocationRow[]>>(`/hostel-allocations${qs ? `?${qs}` : ''}`);
  return res.data;
}

/** Walks Hostel -> Blocks -> Floors -> Rooms once to compute real, aggregate
 * room/bed-capacity structure for one hostel -- no separate per-bed fetch
 * (see this file's own top comment for why). */
export async function getHostelStructure(hostelId: string): Promise<{
  blockCount: number;
  floorCount: number;
  rooms: HostelRoomRow[];
}> {
  const blocks = await listBlocks(hostelId);
  const floorLists = await Promise.all(blocks.map((b) => listFloors(b.id)));
  const floors = floorLists.flat();
  const roomLists = await Promise.all(floors.map((f) => listRooms(f.id)));
  const rooms = roomLists.flat();
  return { blockCount: blocks.length, floorCount: floors.length, rooms };
}
