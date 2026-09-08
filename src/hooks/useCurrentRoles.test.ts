import { renderHook } from '@testing-library/react-native';
import { useMe } from './useMe';
import { useCurrentRoles } from './useCurrentRoles';

// jest.mock is hoisted above these imports by babel-jest regardless of position.
jest.mock('./useMe', () => ({ useMe: jest.fn() }));

const mockUseMe = useMe as jest.Mock;

describe('useCurrentRoles', () => {
  it('isHostelWarden is true only when HOSTEL_WARDEN is among the roles', async () => {
    mockUseMe.mockReturnValue({
      data: { person: { id: 'p1' }, roles: [{ role_code: 'HOSTEL_WARDEN', scope_type: 'HOSTEL', scope_id: 'h1' }] },
      isLoading: false,
    });
    const { result } = await renderHook(() => useCurrentRoles());
    expect(result.current.isHostelWarden).toBe(true);
    expect(result.current.isFaculty).toBe(false);
  });

  it('is false for a Parent/Faculty-only account', async () => {
    mockUseMe.mockReturnValue({
      data: { person: { id: 'p2' }, roles: [{ role_code: 'FACULTY', scope_type: 'SCHOOL', scope_id: null }] },
      isLoading: false,
    });
    const { result } = await renderHook(() => useCurrentRoles());
    expect(result.current.isHostelWarden).toBe(false);
    expect(result.current.isFaculty).toBe(true);
  });

  it('is false while roles are still loading, never a false positive', async () => {
    mockUseMe.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = await renderHook(() => useCurrentRoles());
    expect(result.current.isHostelWarden).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('isPrincipal is true only when PRINCIPAL is among the roles', async () => {
    mockUseMe.mockReturnValue({
      data: { person: { id: 'p3' }, roles: [{ role_code: 'PRINCIPAL', scope_type: 'SCHOOL', scope_id: null }] },
      isLoading: false,
    });
    const { result } = await renderHook(() => useCurrentRoles());
    expect(result.current.isPrincipal).toBe(true);
    expect(result.current.isFaculty).toBe(false);
    expect(result.current.isHostelWarden).toBe(false);
  });
});
