import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { PresenceStatus } from '@acme/shared';

interface RealtimeState {
  socket?: Socket;
  typing: Record<string, Set<string>>;
  presence: Record<string, PresenceStatus>;
  connect: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  typing: {},
  presence: {},
  connect() {
    if (get().socket) return;
    const socket = io('/realtime', {
      withCredentials: true,
    });
    socket.on('presence.state', ({ userId, status }) => {
      set((state) => ({
        presence: {
          ...state.presence,
          [userId]: status,
        },
      }));
    });
    socket.on('typing', ({ channelId, userId }) => {
      set((state) => {
        const key = channelId;
        const current = new Set(state.typing[key] ?? []);
        current.add(userId);
        return { typing: { ...state.typing, [key]: current } };
      });
      setTimeout(() => {
        set((state) => {
          const key = channelId;
          const current = new Set(state.typing[key] ?? []);
          current.delete(userId);
          return { typing: { ...state.typing, [key]: current } };
        });
      }, 3000);
    });
    set({ socket });
  },
}));
