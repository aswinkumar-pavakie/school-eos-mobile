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
    attendanceId: null,
    status: null,
    recordedAt: null,
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
});
