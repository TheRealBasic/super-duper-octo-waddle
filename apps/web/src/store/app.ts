import { create } from 'zustand';
import { api } from '../lib/api';

type ServerSummary = {
  id: string;
  name: string;
  iconUrl?: string;
};

type ChannelSummary = {
  id: string;
  name: string;
  serverId: string;
};

type ThreadSummary = {
  id: string;
  isGroup: boolean;
  participants: { id: string; displayName: string }[];
};

interface AppState {
  servers: ServerSummary[];
  channels: Record<string, ChannelSummary[]>;
  dmThreads: ThreadSummary[];
  loading: boolean;
  fetchServers: () => Promise<void>;
  fetchServerDetail: (serverId: string) => Promise<void>;
  fetchDMs: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  servers: [],
  channels: {},
  dmThreads: [],
  loading: false,
  async fetchServers() {
    set({ loading: true });
    const { data } = await api.get('/servers');
    set({ servers: data.servers, loading: false });
  },
  async fetchServerDetail(serverId) {
    const { data } = await api.get(`/servers/${serverId}`);
    set((state) => ({
      channels: {
        ...state.channels,
        [serverId]: data.server.channels,
      },
    }));
  },
  async fetchDMs() {
    const { data } = await api.get('/dms');
    set({ dmThreads: data.threads });
  },
}));
