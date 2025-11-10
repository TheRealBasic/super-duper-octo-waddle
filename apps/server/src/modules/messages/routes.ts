import type { FastifyInstance } from 'fastify';
import { MessageSchema, PaginationSchema } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerMessageRoutes(app: FastifyInstance) {
  app.get('/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const query = PaginationSchema.parse({
      limit: Number((request.query as any)?.limit ?? 50),
      before: (request.query as any)?.before,
    });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) return reply.notFound();

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId: request.user!.id },
    });
    if (!membership) return reply.forbidden();

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        ...(query.before ? { createdAt: { lt: await getMessageTimestamp(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: { attachments: true, reactions: true, author: true },
    });

    return { messages: messages.reverse() };
  });

  app.post('/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const payload = MessageSchema.parse(request.body ?? {});
    if (!payload.content && payload.attachments.length === 0) {
      return reply.badRequest('Message content or attachment required');
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return reply.notFound();

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId: request.user!.id },
    });
    if (!membership) return reply.forbidden();

    const message = await prisma.message.create({
      data: {
        channelId,
        authorId: request.user!.id,
        content: payload.content,
        attachments: {
          createMany: { data: payload.attachments },
        },
      },
      include: { attachments: true, reactions: true, author: true },
    });

    return { message };
  });

  app.patch('/messages/:messageId', { preHandler: requireAuth }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const { content } = request.body as { content: string };
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return reply.notFound();
    if (message.authorId !== request.user!.id) return reply.forbidden();
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: { author: true },
    });
    return { message: updated };
  });

  app.delete('/messages/:messageId', { preHandler: requireAuth }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return reply.notFound();
    if (message.authorId !== request.user!.id) return reply.forbidden();
    const deleted = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null },
      include: { author: true },
    });
    return { message: deleted };
  });
}

async function getMessageTimestamp(messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  return message?.createdAt ?? new Date();
}
