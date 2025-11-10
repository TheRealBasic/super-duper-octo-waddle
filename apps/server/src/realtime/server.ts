import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import { redis, redisSubscriber } from '../utils/redis.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { prisma } from '../utils/prisma.js';
import { PresenceUpdateSchema, TypingEventSchema, CreateMessageSchema, ReactionSchema } from '@acme/shared';
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

  io.on('connection', (socket) => {
    const user = (socket.data as any).user;

    socket.join(`user:${user.id}`);

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
        include: { attachments: true, reactions: true },
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
  });

  return io;
}
