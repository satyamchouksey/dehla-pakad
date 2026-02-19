import { create } from 'zustand';
import type { AuthUser } from '@shared/types';

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  restore: () => boolean;
}

const STORAGE_KEY_TOKEN = 'dp_token';
const STORAGE_KEY_USER = 'dp_user';

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: true,

  setAuth: (user, token) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    set({ user, token, loading: false });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    set({ user: null, token: null, loading: false });
  },

  setLoading: (loading) => set({ loading }),

  restore: () => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEY_USER);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as AuthUser;
        set({ user, token, loading: false });
        return true;
      } catch {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    }
    set({ loading: false });
    return false;
  },
}));
