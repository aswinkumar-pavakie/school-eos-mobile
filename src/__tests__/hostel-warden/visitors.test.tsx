// Deliberately NOT colocated under app/(protected)/hostel-warden/ -- see
// night-attendance.test.tsx's header comment for why.

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/lib/hostel-warden-api';
import VisitorsScreen from '@app/(protected)/hostel-warden/visitors/index';

// jest.mock calls are hoisted above these imports by babel-jest regardless of
// their literal position in the file.
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('@/lib/hostel-warden-api');

const OPEN_VISITOR = {
  id: 'visitor-1',
  studentId: 'student-1',
  studentFirstName: 'Ajith',
  studentLastName: 'Perumal',
  visitorName: 'Mrs R',
  relationship: 'Mother',
  idProofRef: null,
  phone: null,
  enteredAt: '2026-09-07T10:00:00Z',
  exitedAt: null,
  recordedBy: 'warden-1',
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VisitorsScreen />
    </QueryClientProvider>,
  );
}

async function goToHistoryTab() {
  fireEvent.press(screen.getByText('History'));
  await waitFor(() => expect(screen.queryByText('Search by name or admission no.')).toBeNull());
}

describe('VisitorsScreen', () => {
  beforeEach(() => {
    jest.mocked(api.listRoomAllocations).mockResolvedValue([]);
  });

  it("defaults to the Record visit tab", async () => {
    jest.mocked(api.listVisitors).mockResolvedValue([]);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Record entry')).toBeTruthy());
  });

  it('tapping Mark exit calls exitVisitor with just that visitor\'s id', async () => {
    jest.mocked(api.listVisitors).mockResolvedValue([OPEN_VISITOR] as never);
    jest.mocked(api.exitVisitor).mockResolvedValue({ ...OPEN_VISITOR, exitedAt: '2026-09-07T12:00:00Z' } as never);

    await renderScreen();
    await goToHistoryTab();
    await waitFor(() => expect(screen.getByText('Mrs R')).toBeTruthy());

    fireEvent.press(screen.getByText('Mark exit'));

    await waitFor(() => expect(api.exitVisitor).toHaveBeenCalledWith('visitor-1'));
    expect(api.exitVisitor).toHaveBeenCalledTimes(1);
  });

  // Duplicate exit is safe on the backend (a 0-row conditional UPDATE, returning the
  // existing record rather than an error) -- the frontend's contract with that is
  // simply "never crash and never show an error for a second exit call"; the list
  // refetching to hide the button once exited is exercised implicitly by the same
  // TanStack Query invalidate-on-settle wiring already covered in the Gate Pass and
  // Night Attendance tests, so it isn't re-asserted here to avoid a flaky race
  // between reassigning the list mock and the real invalidate-triggered refetch.
  it('an already-exited visitor shows the Exited status, not a Mark exit button', async () => {
    const exitedVisitor = { ...OPEN_VISITOR, exitedAt: '2026-09-07T12:00:00Z' };
    jest.mocked(api.listVisitors).mockResolvedValue([exitedVisitor] as never);

    await renderScreen();
    await goToHistoryTab();
    await waitFor(() => expect(screen.getByText('Mrs R')).toBeTruthy());

    expect(screen.queryByText('Mark exit')).toBeNull();
    expect(screen.getByText('Exited')).toBeTruthy();
  });
});
