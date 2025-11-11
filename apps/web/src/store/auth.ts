import { create } from 'zustand';
import axios from 'axios';
import type { NotificationSettingsInput, OnboardingPreferencesInput } from '@acme/shared';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = '/api';

interface AuthState {
  user:
    | {
        id: string;
        email: string;
        displayName: string;
        avatarUrl?: string;
        onboarded: boolean;
        preferences?: OnboardingPreferencesInput | null;
        notificationSettings?: NotificationSettingsInput | null;
      }
    | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  oauth: (input: { provider: 'GOOGLE' | 'APPLE'; idToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (
    user:
      | {
          id: string;
          email: string;
          displayName: string;
          avatarUrl?: string;
          onboarded: boolean;
          preferences?: OnboardingPreferencesInput | null;
          notificationSettings?: NotificationSettingsInput | null;
        }
      | null,
  ) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  async hydrate() {
    set({ status: 'loading' });
    try {
      const { data } = await axios.get('/me');
      set({ user: data.user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },
  async login(input) {
    set({ status: 'loading' });
    try {
      await axios.post('/auth/login', input);
      const { data } = await axios.get('/me');
      set({ user: data.user, status: 'authenticated' });
    } catch (error) {
      set({ status: 'unauthenticated' });
      throw error;
    }
  },
  async register(input) {
    set({ status: 'loading' });
    try {
      await axios.post('/auth/register', input);
      const { data } = await axios.get('/me');
      set({ user: data.user, status: 'authenticated' });
    } catch (error) {
      set({ status: 'unauthenticated' });
      throw error;
    }
  },
  async oauth(input) {
    set({ status: 'loading' });
    try {
      await axios.post('/auth/oauth', input);
      const { data } = await axios.get('/me');
      set({ user: data.user, status: 'authenticated' });
    } catch (error) {
      set({ status: 'unauthenticated' });
      throw error;
    }
  },
  async logout() {
    await axios.post('/auth/logout');
    set({ user: null, status: 'unauthenticated' });
  },
  setUser(user) {
    set({ user, status: user ? 'authenticated' : 'unauthenticated' });
  },
}));
