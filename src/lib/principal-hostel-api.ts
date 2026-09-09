// Principal Hostel module -- every read endpoint here (hostels, blocks,
// floors, rooms, allocations) already grants PRINCIPAL the identical
// class-level access as VICE_PRINCIPAL (confirmed by direct backend audit
// across hostels/hostel-blocks/hostel-floors/hostel-rooms/hostel-allocations
// .controller.ts -- Principal's web app calls these exact same endpoints,
// view-only, same full block->floor->room->bed hierarchy). Re-exporting the
// already-correct VP module rather than duplicating it.

export {
  listHostels,
  getHostel,
  listBlocks,
  listFloors,
  listRooms,
  listAllocations,
  getHostelStructure,
  type HostelRow,
  type HostelBlockRow,
  type HostelFloorRow,
  type HostelRoomRow,
  type HostelAllocationRow,
} from './vice-principal-hostel-api';
