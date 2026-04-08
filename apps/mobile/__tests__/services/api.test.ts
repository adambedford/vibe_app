import { useAuthStore } from '@/stores/authStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks are set up
import { auth, feed, apps, me } from '@/services/api';

describe('API client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    useAuthStore.setState({
      user: null,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      isAuthenticated: true,
    });
  });

  describe('auth.login', () => {
    test('sends login request without auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: {
            user: { id: 1, username: 'test' },
            tokens: { access_token: 'abc', refresh_token: 'def' },
          },
        }),
      });

      const result = await auth.login('test@example.com', 'password123');
      expect(result.data.tokens.access_token).toBe('abc');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/auth/login');
      expect(options.headers['Authorization']).toBeUndefined();
    });
  });

  describe('auth.register', () => {
    test('sends registration data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          data: {
            user: { id: 1, username: 'newuser' },
            tokens: { access_token: 'abc', refresh_token: 'def' },
          },
        }),
      });

      await auth.register({
        email: 'new@example.com',
        password: 'pass123',
        display_name: 'New User',
        username: 'newuser',
        date_of_birth: '2000-01-01',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.email).toBe('new@example.com');
      expect(body.username).toBe('newuser');
    });
  });

  describe('authenticated requests', () => {
    test('includes auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { username: 'me' } }),
      });

      await me.get();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer test-token');
    });

    test('handles 401 by attempting refresh', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { code: 'unauthorized' } }),
      });

      // Refresh call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: { access_token: 'new-token', refresh_token: 'new-refresh' },
        }),
      });

      // Retry call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { username: 'me' } }),
      });

      const result = await me.get();
      expect(result.data.username).toBe('me');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('apps', () => {
    test('like sends POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { status: 'ok' } }),
      });

      await apps.like(42);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/apps/42/like');
      expect(options.method).toBe('POST');
    });

    test('play sends duration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.reject(),
      });

      await apps.play(42, 60);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.duration_seconds).toBe(60);
    });
  });
});
