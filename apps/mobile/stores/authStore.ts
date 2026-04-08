import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  app_count: number;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken, refreshToken) => {
    set({ user, accessToken, refreshToken, isAuthenticated: true });
    AsyncStorage.setItem('auth', JSON.stringify({ user, accessToken, refreshToken }));
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    const { user } = get();
    AsyncStorage.setItem('auth', JSON.stringify({ user, accessToken, refreshToken }));
  },

  setUser: (user) => {
    set({ user });
    const { accessToken, refreshToken } = get();
    AsyncStorage.setItem('auth', JSON.stringify({ user, accessToken, refreshToken }));
  },

  logout: () => {
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    AsyncStorage.removeItem('auth');
  },

  loadFromStorage: async () => {
    const stored = await AsyncStorage.getItem('auth');
    if (stored) {
      const { user, accessToken, refreshToken } = JSON.parse(stored);
      set({ user, accessToken, refreshToken, isAuthenticated: !!accessToken });
    }
  },
}));
