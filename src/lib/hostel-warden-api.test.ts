import { authedRequest } from './auth';
import {
  approveGatePassRequest,
  createVisitor,
  exitVisitor,
  getNightAttendanceRoster,
  markNightAttendance,
  rejectGatePassRequest,
  updateComplaintStatus,
} from './hostel-warden-api';

// jest.mock is hoisted above these imports by babel-jest regardless of position.
jest.mock('./auth', () => ({ authedRequest: jest.fn() }));

const mockAuthedRequest = authedRequest as jest.Mock;

describe('hostel-warden-api', () => {
  beforeEach(() => {
    mockAuthedRequest.mockReset();
  });

  it('getNightAttendanceRoster requests the given date and unwraps the envelope', async () => {
    mockAuthedRequest.mockResolvedValue({ data: [{ studentId: 's1' }] });
    const rows = await getNightAttendanceRoster('2026-09-07');
    expect(mockAuthedRequest).toHaveBeenCalledWith('/hostel/night-attendance?date=2026-09-07');
    expect(rows).toEqual([{ studentId: 's1' }]);
  });

  it('markNightAttendance POSTs date + entries', async () => {
    mockAuthedRequest.mockResolvedValue({ data: { marked: 1, date: '2026-09-07' } });
    await markNightAttendance('2026-09-07', [{ studentId: 's1', status: 'PRESENT' }]);
    expect(mockAuthedRequest).toHaveBeenCalledWith('/hostel/night-attendance', {
      method: 'POST',
      body: { date: '2026-09-07', entries: [{ studentId: 's1', status: 'PRESENT' }] },
    });
  });

  it('approveGatePassRequest POSTs an empty body when no comment is given', async () => {
    mockAuthedRequest.mockResolvedValue({ data: { id: 'req-1' } });
    await approveGatePassRequest('req-1');
    expect(mockAuthedRequest).toHaveBeenCalledWith('/hostel/gate-pass-requests/req-1/approve', {
      method: 'POST',
      body: {},
    });
  });

  it('rejectGatePassRequest always sends a comment (backend requires one)', async () => {
    mockAuthedRequest.mockResolvedValue({ data: { id: 'req-1' } });
    await rejectGatePassRequest('req-1', 'Not appropriate');
    expect(mockAuthedRequest).toHaveBeenCalledWith('/hostel/gate-pass-requests/req-1/reject', {
      method: 'POST',
      body: { comment: 'Not appropriate' },
    });
  });

  it('createVisitor omits undefined optional fields from the body as-is (backend defaults them)', async () => {
    mockAuthedRequest.mockResolvedValue({ data: { id: 'v1' } });
    await createVisitor({ studentId: 's1', visitorName: 'Mrs R' });
    expect(mockAuthedRequest).toHaveBeenCalledWith('/hostel/visitors', {
      method: 'POST',
      body: { studentId: 's1', visitorName: 'Mrs R' },
    });
  });

  it('exitVisitor POSTs with no body', async () => {
    mockAuthedRequest.mockResolvedValue({ data: { id: 'v1', exitedAt: '2026-09-07T10:00:00Z' } });
    await exitVisitor('v1');
    expect(mockAuthedRequest).toHaveBeenCalledWith('/hostel/visitors/v1/exit', { method: 'POST' });
  });

  it('updateComplaintStatus PATCHes the new state', async () => {
    mockAuthedRequest.mockResolvedValue({ data: { id: 'c1', state: 'IN_PROGRESS' } });
    await updateComplaintStatus('c1', 'IN_PROGRESS');
    expect(mockAuthedRequest).toHaveBeenCalledWith('/hostel/complaints/c1', {
      method: 'PATCH',
      body: { state: 'IN_PROGRESS' },
    });
  });
});
