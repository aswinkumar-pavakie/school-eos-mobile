import {
  attendanceStatusMeta,
  callRequestStatusMeta,
  complaintStatusMeta,
  fullName,
  issueTypeLabel,
  outingRequestStatusMeta,
  visitorStatusMeta,
} from './hostel-warden-status';

describe('hostel-warden-status', () => {
  it('attendanceStatusMeta maps PRESENT/ABSENT/null', () => {
    expect(attendanceStatusMeta('PRESENT')).toEqual({ label: 'Present', tone: 'positive' });
    expect(attendanceStatusMeta('ABSENT')).toEqual({ label: 'Absent', tone: 'negative' });
    expect(attendanceStatusMeta(null)).toEqual({ label: 'Not marked', tone: 'neutral' });
  });

  it('outingRequestStatusMeta maps every real outing_request.state value', () => {
    expect(outingRequestStatusMeta('REQUESTED').tone).toBe('warning');
    expect(outingRequestStatusMeta('APPROVED').tone).toBe('positive');
    expect(outingRequestStatusMeta('REJECTED').tone).toBe('negative');
    expect(outingRequestStatusMeta('CANCELLED').tone).toBe('neutral');
  });

  it('callRequestStatusMeta maps PENDING/APPROVED/REJECTED', () => {
    expect(callRequestStatusMeta('PENDING').label).toBe('Pending');
    expect(callRequestStatusMeta('APPROVED').label).toBe('Approved');
    expect(callRequestStatusMeta('REJECTED').label).toBe('Rejected');
  });

  it('visitorStatusMeta reflects exitedAt presence', () => {
    expect(visitorStatusMeta(null)).toEqual({ label: 'On premises', tone: 'positive' });
    expect(visitorStatusMeta('2026-09-07T10:00:00Z').tone).toBe('neutral');
  });

  it('complaintStatusMeta maps every real complaint.state value (no invented ASSIGNED state)', () => {
    expect(complaintStatusMeta('OPEN').label).toBe('Open');
    expect(complaintStatusMeta('IN_PROGRESS').label).toBe('In progress');
    expect(complaintStatusMeta('ESCALATED').tone).toBe('negative');
    expect(complaintStatusMeta('RESOLVED').tone).toBe('positive');
    expect(complaintStatusMeta('CLOSED').tone).toBe('neutral');
    expect(complaintStatusMeta('REJECTED').tone).toBe('negative');
  });

  it('issueTypeLabel humanizes known issue types and falls back to the raw value otherwise', () => {
    expect(issueTypeLabel('ELECTRICAL')).toBe('Electrical');
    expect(issueTypeLabel('WATER_LEAKAGE')).toBe('Water leakage');
    expect(issueTypeLabel('SOMETHING_UNKNOWN')).toBe('SOMETHING_UNKNOWN');
  });

  it('fullName joins first/last, omitting a null last name', () => {
    expect(fullName('Asha', 'Rao')).toBe('Asha Rao');
    expect(fullName('Asha', null)).toBe('Asha');
  });
});
