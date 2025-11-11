import type { FastifyInstance } from 'fastify';
import { Permission } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerModerationRoutes(app: FastifyInstance) {
  app.post('/moderation/kick', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, userId } = request.body as { serverId: string; userId: string };
    const moderator = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!moderator) return reply.forbidden();
    const permissions = moderator.roles.reduce((acc, role) => acc | role.role.permissions, 0);
    if ((permissions & Permission.KICK_MEMBERS) !== Permission.KICK_MEMBERS) return reply.forbidden();

    await prisma.serverMember.deleteMany({ where: { serverId, userId } });
    return { success: true };
  });

  app.post('/moderation/ban', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, userId, reason } = request.body as { serverId: string; userId: string; reason?: string };
    const moderator = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!moderator) return reply.forbidden();
    const permissions = moderator.roles.reduce((acc, role) => acc | role.role.permissions, 0);
    if ((permissions & Permission.BAN_MEMBERS) !== Permission.BAN_MEMBERS) return reply.forbidden();

    await prisma.serverMember.updateMany({
      where: { serverId, userId },
      data: { isBanned: true },
    });
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: request.user!.id,
        action: 'ban',
        targetId: userId,
        metadata: reason ? { reason } : undefined,
      },
    });
    return { success: true };
  });
}
