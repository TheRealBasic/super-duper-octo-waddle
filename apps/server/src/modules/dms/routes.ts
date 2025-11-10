import type { FastifyInstance } from 'fastify';
import { DMThreadCreateSchema, MessageSchema } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerDMRoutes(app: FastifyInstance) {
  app.get('/dms', { preHandler: requireAuth }, async (request) => {
    const threads = await prisma.dMParticipant.findMany({
      where: { userId: request.user!.id },
      include: { thread: { include: { participants: { include: { user: true } } } } },
    });
    return {
      threads: threads.map((entry) => ({
        id: entry.thread.id,
        isGroup: entry.thread.isGroup,
        participants: entry.thread.participants.map((p) => ({ id: p.userId, displayName: p.user.displayName })),
      })),
    };
  });

  app.post('/dms', { preHandler: requireAuth }, async (request, reply) => {
    const payload = DMThreadCreateSchema.parse(request.body);
    const participantIds = Array.from(new Set([request.user!.id, ...payload.userIds]));
    const isGroup = participantIds.length > 2;

    const existing = await prisma.dMParticipant.findFirst({
      where: {
        userId: request.user!.id,
        thread: {
          participants: {
            every: {
              userId: { in: participantIds },
            },
          },
        },
      },
      include: { thread: true },
    });

    if (existing) {
      return { thread: existing.thread };
    }

    const thread = await prisma.dMThread.create({
      data: {
        isGroup,
        participants: {
          createMany: {
            data: participantIds.map((userId) => ({ userId })),
          },
        },
      },
      include: { participants: { include: { user: true } } },
    });

    return {
      thread: {
        id: thread.id,
        isGroup: thread.isGroup,
        participants: thread.participants.map((p) => ({ id: p.userId, displayName: p.user.displayName })),
      },
    };
  });

  app.get('/dms/:threadId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const participant = await prisma.dMParticipant.findFirst({
      where: { threadId, userId: request.user!.id },
    });
    if (!participant) return reply.forbidden();

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      include: { attachments: true, reactions: true, author: true },
    });
    return { messages };
  });

  app.post('/dms/:threadId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const payload = MessageSchema.parse(request.body ?? {});
    if (!payload.content && payload.attachments.length === 0) {
      return reply.badRequest('Message content or attachment required');
    }
    const participant = await prisma.dMParticipant.findFirst({
      where: { threadId, userId: request.user!.id },
    });
    if (!participant) return reply.forbidden();

    const message = await prisma.message.create({
      data: {
        threadId,
        authorId: request.user!.id,
        content: payload.content,
        attachments: {
          createMany: {
            data: payload.attachments,
          },
        },
      },
      include: { attachments: true, reactions: true, author: true },
    });

    return { message };
  });
}
