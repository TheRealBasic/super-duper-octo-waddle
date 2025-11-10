import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { useRealtimeStore } from './realtime';
import { useAuthStore } from './auth';

type VoiceRoom = { channelId?: string; threadId?: string };

type Participant = {
  userId: string;
  stream?: MediaStream;
  videoEnabled: boolean;
  isLocal?: boolean;
};

interface VoiceState {
  currentRoom?: VoiceRoom;
  participants: Record<string, Participant>;
  localStream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  joining: boolean;
  joinChannel: (channelId: string, enableVideo?: boolean) => Promise<void>;
  joinThread: (threadId: string, enableVideo?: boolean) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
}

const peerConnections = new Map<string, RTCPeerConnection>();
let socketBound = false;

export const useVoiceStore = create<VoiceState>((set, get) => ({
  currentRoom: undefined,
  participants: {},
  localStream: undefined,
  audioEnabled: false,
  videoEnabled: false,
  joining: false,
  async joinChannel(channelId, enableVideo = false) {
    await get().leave();
    set({ joining: true });
    try {
      const socket = await ensureSocket();
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: enableVideo });
      const stream = media;
      const user = useAuthStore.getState().user;
      const participants: Record<string, Participant> = {};
      if (user) {
        participants[user.id] = {
          userId: user.id,
          stream,
          videoEnabled: enableVideo,
          isLocal: true,
        };
      }
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      if (!enableVideo) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      peerConnections.clear();
      set({
        currentRoom: { channelId },
        localStream: stream,
        participants,
        audioEnabled: true,
        videoEnabled: enableVideo,
        joining: false,
      });
      socket.emit('rtc.join', { channelId, enableVideo });
    } catch (error) {
      console.error('Failed to join channel call', error);
      set({ joining: false });
    }
  },
  async joinThread(threadId, enableVideo = false) {
    await get().leave();
    set({ joining: true });
    try {
      const socket = await ensureSocket();
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: enableVideo });
      const stream = media;
      const user = useAuthStore.getState().user;
      const participants: Record<string, Participant> = {};
      if (user) {
        participants[user.id] = {
          userId: user.id,
          stream,
          videoEnabled: enableVideo,
          isLocal: true,
        };
      }
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      if (!enableVideo) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      peerConnections.clear();
      set({
        currentRoom: { threadId },
        localStream: stream,
        participants,
        audioEnabled: true,
        videoEnabled: enableVideo,
        joining: false,
      });
      socket.emit('rtc.join', { threadId, enableVideo });
    } catch (error) {
      console.error('Failed to join DM call', error);
      set({ joining: false });
    }
  },
  async leave() {
    const { currentRoom, localStream } = get();
    const socket = useRealtimeStore.getState().socket;
    if (currentRoom && socket) {
      socket.emit('rtc.leave', currentRoom);
    }
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();
    localStream?.getTracks().forEach((track) => track.stop());
    set({
      currentRoom: undefined,
      participants: {},
      localStream: undefined,
      audioEnabled: false,
      videoEnabled: false,
      joining: false,
    });
  },
  toggleMute() {
    const { localStream, audioEnabled } = get();
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !audioEnabled;
    });
    set({ audioEnabled: !audioEnabled });
  },
  async toggleVideo() {
    const { localStream, videoEnabled, currentRoom, participants } = get();
    if (!localStream || !currentRoom) return;
    const socket = useRealtimeStore.getState().socket;
    const userId = useAuthStore.getState().user?.id;
    if (videoEnabled) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.stop();
        localStream.removeTrack(track);
      }
      peerConnections.forEach((pc) => {
        pc.getSenders()
          .filter((sender) => sender.track?.kind === 'video')
          .forEach((sender) => sender.replaceTrack(null));
      });
      socket?.emit('rtc.media-update', { ...currentRoom, videoEnabled: false });
      if (userId) {
        set({
          videoEnabled: false,
          participants: {
            ...participants,
            [userId]: {
              ...(participants[userId] ?? { userId }),
              stream: localStream,
              videoEnabled: false,
              isLocal: true,
            },
          },
        });
      } else {
        set({ videoEnabled: false });
      }
    } else {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = media.getVideoTracks()[0];
        if (!newTrack) return;
        localStream.addTrack(newTrack);
        peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            pc.addTrack(newTrack, localStream);
          }
        });
        socket?.emit('rtc.media-update', { ...currentRoom, videoEnabled: true });
        if (userId) {
          set({
            videoEnabled: true,
            participants: {
              ...participants,
              [userId]: {
                ...(participants[userId] ?? { userId }),
                stream: localStream,
                videoEnabled: true,
                isLocal: true,
              },
            },
          });
        } else {
          set({ videoEnabled: true });
        }
      } catch (error) {
        console.error('Unable to enable video', error);
      }
    }
  },
}));

function roomMatches(a?: VoiceRoom, b?: VoiceRoom) {
  if (!a || !b) return false;
  if (a.channelId && b.channelId) return a.channelId === b.channelId;
  if (a.threadId && b.threadId) return a.threadId === b.threadId;
  return false;
}

function ensureSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    let socket = useRealtimeStore.getState().socket;
    if (!socket) {
      useRealtimeStore.getState().connect();
      socket = useRealtimeStore.getState().socket;
    }
    if (!socket) {
      reject(new Error('Realtime connection unavailable'));
      return;
    }
    if (!socketBound) {
      bindSocketEvents(socket);
      socketBound = true;
    }
    if (socket.connected) {
      resolve(socket);
    } else {
      socket.once('connect', () => resolve(socket!));
    }
  });
}

function bindSocketEvents(socket: Socket) {
  socket.on('rtc.participants', ({ room, participants }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    useVoiceStore.setState((prev) => {
      const next = { ...prev.participants };
      participants.forEach((participant: { userId: string; videoEnabled: boolean }) => {
        next[participant.userId] = {
          ...(next[participant.userId] ?? { userId: participant.userId }),
          videoEnabled: participant.videoEnabled,
        };
      });
      return { participants: next };
    });
    participants.forEach((participant: { userId: string }) => {
      createPeerConnection(participant.userId, true);
    });
  });

  socket.on('rtc.participant-joined', ({ room, userId, videoEnabled }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    useVoiceStore.setState((prev) => ({
      participants: {
        ...prev.participants,
        [userId]: {
          ...(prev.participants[userId] ?? { userId }),
          videoEnabled: Boolean(videoEnabled),
        },
      },
    }));
  });

  socket.on('rtc.participant-left', ({ room, userId }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    peerConnections.get(userId)?.close();
    peerConnections.delete(userId);
    useVoiceStore.setState((prev) => {
      const next = { ...prev.participants };
      delete next[userId];
      return { participants: next };
    });
  });

  socket.on('rtc.media-updated', ({ room, userId, videoEnabled }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    useVoiceStore.setState((prev) => ({
      participants: {
        ...prev.participants,
        [userId]: {
          ...(prev.participants[userId] ?? { userId }),
          videoEnabled: Boolean(videoEnabled),
          stream: prev.participants[userId]?.stream,
        },
      },
    }));
  });

  socket.on('rtc.signal', async ({ room, fromUserId, payload }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    const pc = createPeerConnection(fromUserId, false);
    const sendSignal = (data: any) => {
      const activeRoom = useVoiceStore.getState().currentRoom;
      if (!activeRoom) return;
      socket.emit('rtc.signal', {
        ...activeRoom,
        targetUserId: fromUserId,
        payload: data,
      });
    };
    if (!pc) return;
    try {
      if (payload.type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'answer', sdp: answer.sdp ?? '' });
      } else if (payload.type === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
      } else if (payload.type === 'ice') {
        await pc.addIceCandidate({
          candidate: payload.candidate.candidate,
          sdpMid: payload.candidate.sdpMid ?? undefined,
          sdpMLineIndex: payload.candidate.sdpMLineIndex ?? undefined,
        });
      }
    } catch (error) {
      console.error('RTC signal error', error);
    }
  });

  socket.on('disconnect', () => {
    useVoiceStore
      .getState()
      .leave()
      .catch(() => undefined);
  });
}

function createPeerConnection(userId: string, initiator: boolean) {
  if (peerConnections.has(userId)) {
    return peerConnections.get(userId)!;
  }
  const socket = useRealtimeStore.getState().socket;
  const state = useVoiceStore.getState();
  if (!socket || !state.currentRoom || !state.localStream) return;
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });
  state.localStream.getTracks().forEach((track) => {
    pc.addTrack(track, state.localStream!);
  });
  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    useVoiceStore.setState((prev) => ({
      participants: {
        ...prev.participants,
        [userId]: {
          ...(prev.participants[userId] ?? { userId }),
          stream,
        },
      },
    }));
  };
  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    const room = useVoiceStore.getState().currentRoom;
    if (!room) return;
    socket.emit('rtc.signal', {
      ...room,
      targetUserId: userId,
      payload: {
        type: 'ice',
        candidate: {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? null,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
        },
      },
    });
  };
  peerConnections.set(userId, pc);
  if (initiator) {
    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const room = useVoiceStore.getState().currentRoom;
        if (!room) return;
        socket.emit('rtc.signal', {
          ...room,
          targetUserId: userId,
          payload: { type: 'offer', sdp: offer.sdp ?? '' },
        });
      } catch (error) {
        console.error('RTC offer error', error);
      }
    })();
  }
  return pc;
}
