// Deliberately NOT colocated under app/(protected)/hostel-warden/ -- expo-router
// scans every file under app/ as a candidate route, and @testing-library/react-native
// pulls in Node's own `console` module, which broke Android/iOS bundling the one time
// this test lived there (see metro.config.js's own blockList, kept as defense in
// depth regardless).

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/lib/hostel-warden-api';
import NightAttendanceScreen from '@app/(protected)/hostel-warden/night-attendance/index';

// jest.mock calls are hoisted above these imports by babel-jest regardless of
// their literal position in the file.
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('@/lib/hostel-warden-api');

const ROSTER = [
  {
    studentId: 'student-1',
    firstName: 'Ajith',
    lastName: 'Perumal',
    admissionNo: 'SMS20250760',
    roomNo: '108',
    bedNo: '108-1',
    blockId: 'block-1',
    blockName: 'Block A',
    floorNo: 1,
    attendanceId: null,
    status: null,
    recordedAt: null,
    hasApprovedLeaveToday: false,
  },
];

const ROSTER_WITH_LEAVE = [
  ...ROSTER,
  {
    studentId: 'student-2',
    firstName: 'Divya',
    lastName: 'Menon',
    admissionNo: 'SMS20250761',
    roomNo: '204',
    bedNo: '204-2',
    blockId: 'block-2',
    blockName: 'Block B',
    floorNo: 2,
    attendanceId: null,
    status: null,
    recordedAt: null,
    hasApprovedLeaveToday: true,
  },
];

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NightAttendanceScreen />
    </QueryClientProvider>,
  );
}

describe('NightAttendanceScreen', () => {
  beforeEach(() => {
    jest.mocked(api.getNightAttendanceRoster).mockResolvedValue(ROSTER as never);
    jest.mocked(api.markNightAttendance).mockResolvedValue({ marked: 1, date: '2026-09-07' });
  });

  it('renders the roster once loaded', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Ajith Perumal')).toBeTruthy());
    expect(screen.getByText(/SMS20250760/)).toBeTruthy();
  });

  it('tapping Present marks that student present', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Ajith Perumal')).toBeTruthy());

    fireEvent.press(screen.getByText('Present'));

    await waitFor(() =>
      expect(api.markNightAttendance).toHaveBeenCalledWith(expect.any(String), [
        { studentId: 'student-1', status: 'PRESENT' },
      ]),
    );
  });

  it('shows an empty state when no students are allocated', async () => {
    jest.mocked(api.getNightAttendanceRoster).mockResolvedValue([]);
    await renderScreen();
    await waitFor(() => expect(screen.getByText(/No students currently allocated/)).toBeTruthy());
  });

  it('defaults an unmarked student with an approved leave to Absent, and everyone else to Present', async () => {
    jest.mocked(api.getNightAttendanceRoster).mockResolvedValue(ROSTER_WITH_LEAVE as never);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Divya Menon')).toBeTruthy());

    expect(screen.getAllByText(/Present · default/).length).toBe(1);
    expect(screen.getAllByText(/Absent · default/).length).toBe(1);
  });

  it("'Mark all present' never sweeps a student defaulting to Absent from an approved leave", async () => {
    jest.mocked(api.getNightAttendanceRoster).mockResolvedValue(ROSTER_WITH_LEAVE as never);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Divya Menon')).toBeTruthy());

    fireEvent.press(screen.getByText('Mark all present'));

    await waitFor(() =>
      expect(api.markNightAttendance).toHaveBeenCalledWith(expect.any(String), [
        { studentId: 'student-1', status: 'PRESENT' },
      ]),
    );
  });

  it('filters the roster by block', async () => {
    jest.mocked(api.getNightAttendanceRoster).mockResolvedValue(ROSTER_WITH_LEAVE as never);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Divya Menon')).toBeTruthy());

    fireEvent.press(screen.getByText('All blocks'));
    await waitFor(() => expect(screen.getByText('Block A')).toBeTruthy());
    fireEvent.press(screen.getByText('Block A'));

    await waitFor(() => expect(screen.queryByText('Divya Menon')).toBeNull());
    expect(screen.getByText('Ajith Perumal')).toBeTruthy();
  });
});
