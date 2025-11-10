import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import { redis, redisSubscriber } from '../utils/redis.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { prisma } from '../utils/prisma.js';
import {
  PresenceUpdateSchema,
  TypingEventSchema,
  CreateMessageSchema,
  ReactionSchema,
  RTCJoinSchema,
  RTCLeaveSchema,
  RTCSignalSchema,
  RTCMediaUpdateSchema,
} from '@acme/shared';
import cookie from 'cookie';

export function createRealtimeServer(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    path: '/realtime',
    cors: {
      origin: app.config.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.adapter(createAdapter(redis, redisSubscriber));

  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || cookie.parse(socket.handshake.headers.cookie ?? '').accessToken;
      if (!rawToken) return next(new Error('Unauthorized'));
      const payload = verifyAccessToken(rawToken);
      const sessionUserId = await redis.get(`session:${payload.sessionId}`);
      if (sessionUserId !== payload.sub) return next(new Error('Unauthorized'));
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return next(new Error('Unauthorized'));
      (socket.data as any).user = user;
      (socket.data as any).sessionId = payload.sessionId;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  const voiceRooms = new Map<string, Set<string>>();
  const voiceVideoState = new Map<string, Map<string, boolean>>();

  function roomKeyFromPayload(payload: { channelId?: string; threadId?: string }) {
    if (payload.channelId) {
      return { key: `voice:channel:${payload.channelId}`, room: { channelId: payload.channelId } };
    }
    if (payload.threadId) {
      return { key: `voice:thread:${payload.threadId}`, room: { threadId: payload.threadId } };
    }
    throw new Error('Invalid room');
  }

  function deserializeRoomKey(key: string) {
    if (key.startsWith('voice:channel:')) {
      return { channelId: key.split(':')[2] };
    }
    if (key.startsWith('voice:thread:')) {
      return { threadId: key.split(':')[2] };
    }
    return {};
  }

  async function ensureVoiceJoin(payload: { channelId?: string; threadId?: string }, userId: string) {
    if (payload.channelId) {
      const channel = await prisma.channel.findUnique({ where: { id: payload.channelId } });
      if (!channel || channel.type !== 'VOICE') {
        throw new Error('Invalid channel');
      }
      const membership = await prisma.serverMember.findFirst({
        where: { serverId: channel.serverId, userId },
      });
      if (!membership) {
        throw new Error('Forbidden');
      }
      return roomKeyFromPayload(payload);
    }
    if (payload.threadId) {
      const thread = await prisma.dMThread.findUnique({
        where: { id: payload.threadId },
        include: { participants: true },
      });
      if (!thread) {
        throw new Error('Invalid thread');
      }
      const isParticipant = thread.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        throw new Error('Forbidden');
      }
      return roomKeyFromPayload(payload);
    }
    throw new Error('Invalid room');
  }

  io.on('connection', (socket) => {
    const user = (socket.data as any).user;

    socket.join(`user:${user.id}`);
    const joinedVoiceRooms = new Set<string>();

    socket.on('presence.update', async (payload) => {
      const parsed = PresenceUpdateSchema.safeParse(payload);
      if (!parsed.success) return;
      await prisma.presence.upsert({
        where: { userId: user.id },
        update: { status: parsed.data.status, updatedAt: new Date() },
        create: { userId: user.id, status: parsed.data.status },
      });
      io.emit('presence.state', { userId: user.id, status: parsed.data.status });
    });

    socket.on('typing.start', async (payload) => {
      const parsed = TypingEventSchema.safeParse(payload);
      if (!parsed.success) return;
      io.to(parsed.data.channelId ?? parsed.data.threadId ?? '').emit('typing', {
        userId: user.id,
        ...parsed.data,
      });
    });

    socket.on('channel.join', (channelId: string) => {
      socket.join(channelId);
    });

    socket.on('channel.leave', (channelId: string) => {
      socket.leave(channelId);
    });

    socket.on('message.create', async (payload, callback) => {
      const parsed = CreateMessageSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ error: 'Invalid payload' });
        return;
      }

      const message = await prisma.message.create({
        data: {
          channelId: parsed.data.channelId,
          threadId: parsed.data.threadId,
          authorId: user.id,
          content: parsed.data.content,
          attachments: {
            createMany: {
              data: parsed.data.attachments,
            },
          },
        },
        include: { attachments: true, reactions: true, author: true },
      });

      const target = message.channelId ?? message.threadId;
      if (target) io.to(target).emit('message.created', message);

      callback?.({ message });
    });

    socket.on('message.edit', async ({ messageId, content }) => {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });
      if (!message || message.authorId !== user.id) return;
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content, editedAt: new Date() },
        include: { author: true, attachments: true, reactions: true },
      });
      const target = updated.channelId ?? updated.threadId;
      if (target) io.to(target).emit('message.updated', updated);
    });

    socket.on('message.delete', async ({ messageId }) => {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });
      if (!message || message.authorId !== user.id) return;
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), content: null },
      });
      const target = message.channelId ?? message.threadId;
      if (target) io.to(target).emit('message.deleted', { messageId });
    });

    socket.on('reaction.add', async (payload) => {
      const parsed = ReactionSchema.safeParse(payload);
      if (!parsed.success) return;
      await prisma.reaction.upsert({
        where: {
          messageId_userId_emoji: {
            messageId: parsed.data.messageId,
            userId: user.id,
            emoji: parsed.data.emoji,
          },
        },
        update: {},
        create: {
          messageId: parsed.data.messageId,
          userId: user.id,
          emoji: parsed.data.emoji,
        },
      });
      const count = await prisma.reaction.count({
        where: { messageId: parsed.data.messageId, emoji: parsed.data.emoji },
      });
      io.emit('reaction.updated', {
        messageId: parsed.data.messageId,
        emoji: parsed.data.emoji,
        count,
        userId: user.id,
      });
    });

    socket.on('reaction.remove', async (payload) => {
      const parsed = ReactionSchema.safeParse(payload);
      if (!parsed.success) return;
      await prisma.reaction.deleteMany({
        where: { messageId: parsed.data.messageId, userId: user.id, emoji: parsed.data.emoji },
      });
      const count = await prisma.reaction.count({
        where: { messageId: parsed.data.messageId, emoji: parsed.data.emoji },
      });
      io.emit('reaction.updated', {
        messageId: parsed.data.messageId,
        emoji: parsed.data.emoji,
        count,
        userId: user.id,
      });
    });

    socket.on('rtc.join', async (payload) => {
      const parsed = RTCJoinSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = await ensureVoiceJoin(parsed.data, user.id);
        joinedVoiceRooms.add(key);
        socket.join(key);
        const participants = voiceRooms.get(key) ?? new Set<string>();
        voiceRooms.set(key, participants);
        participants.add(user.id);
        const videoState = voiceVideoState.get(key) ?? new Map<string, boolean>();
        voiceVideoState.set(key, videoState);
        const enableVideo = parsed.data.enableVideo ?? false;
        videoState.set(user.id, enableVideo);
        const others = Array.from(participants)
          .filter((id) => id !== user.id)
          .map((id) => ({ userId: id, videoEnabled: videoState.get(id) ?? false }));
        socket.emit('rtc.participants', { room, participants: others });
        socket.to(key).emit('rtc.participant-joined', { room, userId: user.id, videoEnabled: enableVideo });
      } catch (err) {
        app.log.warn({ err }, 'voice join failed');
      }
    });

    socket.on('rtc.leave', async (payload) => {
      const parsed = RTCLeaveSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = roomKeyFromPayload(parsed.data);
        if (!joinedVoiceRooms.has(key)) return;
        joinedVoiceRooms.delete(key);
        socket.leave(key);
        const participants = voiceRooms.get(key);
        if (participants) {
          participants.delete(user.id);
          if (participants.size === 0) {
            voiceRooms.delete(key);
          }
        }
        const videoState = voiceVideoState.get(key);
        videoState?.delete(user.id);
        socket.to(key).emit('rtc.participant-left', { room, userId: user.id });
      } catch (err) {
        app.log.warn({ err }, 'voice leave failed');
      }
    });

    socket.on('rtc.signal', async (payload) => {
      const parsed = RTCSignalSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = roomKeyFromPayload(parsed.data);
        if (!joinedVoiceRooms.has(key)) return;
        const participants = voiceRooms.get(key);
        if (!participants || !participants.has(parsed.data.targetUserId)) return;
        io.to(`user:${parsed.data.targetUserId}`).emit('rtc.signal', {
          room,
          fromUserId: user.id,
          payload: parsed.data.payload,
        });
      } catch (err) {
        app.log.warn({ err }, 'voice signal failed');
      }
    });

    socket.on('rtc.media-update', async (payload) => {
      const parsed = RTCMediaUpdateSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = roomKeyFromPayload(parsed.data);
        if (!joinedVoiceRooms.has(key)) return;
        const videoState = voiceVideoState.get(key) ?? new Map<string, boolean>();
        voiceVideoState.set(key, videoState);
        videoState.set(user.id, parsed.data.videoEnabled);
        socket.to(key).emit('rtc.media-updated', {
          room,
          userId: user.id,
          videoEnabled: parsed.data.videoEnabled,
        });
      } catch (err) {
        app.log.warn({ err }, 'voice media update failed');
      }
    });

    socket.on('disconnect', () => {
      for (const key of joinedVoiceRooms) {
        const room = deserializeRoomKey(key);
        const participants = voiceRooms.get(key);
        participants?.delete(user.id);
        if (participants && participants.size === 0) {
          voiceRooms.delete(key);
        }
        const videoState = voiceVideoState.get(key);
        videoState?.delete(user.id);
        socket.to(key).emit('rtc.participant-left', { room, userId: user.id });
      }
      joinedVoiceRooms.clear();
    });
  });

  return io;
}
