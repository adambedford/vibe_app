import { useAuthStore } from '@/stores/authStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockUser = {
  id: 1,
  username: 'testuser',
  display_name: 'Test User',
  avatar_url: null,
  bio: null,
  follower_count: 0,
  following_count: 0,
  app_count: 0,
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  test('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  test('setAuth sets user and tokens', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-123', 'refresh-456');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
  });

  test('setTokens updates tokens without changing user', () => {
    useAuthStore.getState().setAuth(mockUser, 'old-access', 'old-refresh');
    useAuthStore.getState().setTokens('new-access', 'new-refresh');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
  });

  test('setUser updates user without changing tokens', () => {
    useAuthStore.getState().setAuth(mockUser, 'access', 'refresh');
    const updated = { ...mockUser, display_name: 'Updated Name' };
    useAuthStore.getState().setUser(updated);
    const state = useAuthStore.getState();
    expect(state.user?.display_name).toBe('Updated Name');
    expect(state.accessToken).toBe('access');
  });

  test('logout clears everything', () => {
    useAuthStore.getState().setAuth(mockUser, 'access', 'refresh');
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
