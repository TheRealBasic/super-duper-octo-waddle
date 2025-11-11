import type { FastifyInstance } from 'fastify';
import { CreateChannelSchema, Permission } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerChannelRoutes(app: FastifyInstance) {
  app.post('/channels', { preHandler: requireAuth }, async (request, reply) => {
    const data = CreateChannelSchema.parse(request.body);
    const member = await prisma.serverMember.findFirst({
      where: { serverId: data.serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const permissions = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((permissions & Permission.MANAGE_CHANNELS) !== Permission.MANAGE_CHANNELS) {
      return reply.forbidden();
    }

    const lastChannel = await prisma.channel.findFirst({
      where: { serverId: data.serverId },
      orderBy: { position: 'desc' },
    });

    const channel = await prisma.channel.create({
      data: {
        serverId: data.serverId,
        name: data.name,
        parentId: data.parentId ?? undefined,
        isPrivate: data.isPrivate ?? false,
        type: data.type,
        position: (lastChannel?.position ?? 0) + 1,
      },
    });

    return { channel };
  });
}
