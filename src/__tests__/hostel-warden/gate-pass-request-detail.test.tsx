// Deliberately NOT colocated under app/(protected)/hostel-warden/ -- see
// night-attendance.test.tsx's header comment for why.

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/lib/hostel-warden-api';
import { ApiError } from '@/lib/api';
import GatePassRequestDetailScreen from '@app/(protected)/hostel-warden/gate-pass-requests/[id]/index';

// jest.mock calls are hoisted above these imports by babel-jest regardless of
// their literal position in the file -- placed after the imports here purely so
// the mocked names above are visible for reference in comments/readability.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'req-1' }),
}));
jest.mock('@/lib/hostel-warden-api');

const REQUEST = {
  id: 'req-1',
  studentId: 'student-1',
  studentFirstName: 'Ajith',
  studentLastName: 'Perumal',
  requestedBy: 'parent-1',
  requestedAt: '2026-09-07T09:00:00Z',
  outFrom: '2026-09-10T09:00:00Z',
  expectedReturn: '2026-09-10T18:00:00Z',
  isOvernight: false,
  reason: 'Family function',
  destination: 'Home',
  approvalRequestId: 'appr-1',
  state: 'REQUESTED',
  requestType: 'HOSTEL_GATE_PASS_REQUEST',
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GatePassRequestDetailScreen />
    </QueryClientProvider>,
  );
}

describe('GatePassRequestDetailScreen', () => {
  beforeEach(() => {
    jest.mocked(api.getGatePassRequest).mockResolvedValue(REQUEST as never);
    // react-native's own Alert.alert isn't a real function in this test environment
    // (it's undefined until a real native module is present) -- jest.spyOn requires
    // an existing function to wrap, so a plain reassignment is used instead.
    Alert.alert = jest.fn();
  });

  it('renders the request and approves it when the confirmation is accepted', async () => {
    jest.mocked(api.approveGatePassRequest).mockResolvedValue({ ...REQUEST, state: 'APPROVED' } as never);
    (Alert.alert as jest.Mock).mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b: { text: string }) => b.text === 'Approve')?.onPress?.();
    });

    await renderScreen();
    await waitFor(() => expect(screen.getByText('Ajith Perumal')).toBeTruthy());

    fireEvent.press(screen.getByText('Approve'));

    await waitFor(() => expect(api.approveGatePassRequest).toHaveBeenCalledWith('req-1'), { timeout: 10000 });
  }, 15000);

  it('rejecting requires a reason and calls rejectGatePassRequest with it', async () => {
    jest.mocked(api.rejectGatePassRequest).mockResolvedValue({ ...REQUEST, state: 'REJECTED' } as never);

    await renderScreen();
    await waitFor(() => expect(screen.getByText('Ajith Perumal')).toBeTruthy());

    fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter a reason')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText('Enter a reason'), 'Not appropriate timing');
    // Wait for the controlled input's re-render to flush the new value -- the
    // modal's submit button is disabled while its local `reason` state is still
    // empty, and pressing it before that re-render lands is a silent no-op.
    await waitFor(() => expect(screen.getByPlaceholderText('Enter a reason').props.value).toBe('Not appropriate timing'));
    // Two "Reject" texts are on screen once the modal is open (the card's own
    // button behind it, plus the modal's submit button) -- the modal's own submit
    // button renders later in the tree, so it's the last match.
    const rejectButtons = screen.getAllByText('Reject');
    fireEvent.press(rejectButtons[rejectButtons.length - 1]!);

    await waitFor(() =>
      expect(api.rejectGatePassRequest).toHaveBeenCalledWith('req-1', 'Not appropriate timing'),
    );
  });

  it('shows the backend message on a 409 (already decided) and does not crash', async () => {
    jest.mocked(api.approveGatePassRequest).mockRejectedValue(new ApiError(409, 'This approval request has already been decided'));
    (Alert.alert as jest.Mock).mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b: { text: string }) => b.text === 'Approve')?.onPress?.();
    });

    await renderScreen();
    await waitFor(() => expect(screen.getByText('Ajith Perumal')).toBeTruthy());
    fireEvent.press(screen.getByText('Approve'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Could not approve', 'This approval request has already been decided'),
    );
  });
});
