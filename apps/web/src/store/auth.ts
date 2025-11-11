import { create } from 'zustand';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = '/api';

interface AuthState {
  user: { id: string; email: string; displayName: string; avatarUrl?: string } | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
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
    await axios.post('/auth/login', input);
    const { data } = await axios.get('/me');
    set({ user: data.user, status: 'authenticated' });
  },
  async register(input) {
    set({ status: 'loading' });
    await axios.post('/auth/register', input);
    const { data } = await axios.get('/me');
    set({ user: data.user, status: 'authenticated' });
  },
  async logout() {
    await axios.post('/auth/logout');
    set({ user: null, status: 'unauthenticated' });
  },
}));
