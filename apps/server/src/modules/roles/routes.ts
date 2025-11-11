import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';
import { Permission } from '@acme/shared';

export async function registerRoleRoutes(app: FastifyInstance) {
  app.post('/servers/:serverId/roles', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const { name, permissions, color } = request.body as { name: string; permissions: number; color?: string };
    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const bitset = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((bitset & Permission.MANAGE_ROLES) !== Permission.MANAGE_ROLES) return reply.forbidden();
    const position = ((await prisma.role.findFirst({ where: { serverId }, orderBy: { position: 'desc' } }))?.position ?? 0) + 1;
    const role = await prisma.role.create({
      data: {
        serverId,
        name,
        permissions,
        color,
        position,
      },
    });
    return { role };
  });

  app.patch('/servers/:serverId/roles/:roleId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, roleId } = request.params as { serverId: string; roleId: string };
    const { name, permissions, color } = request.body as { name?: string; permissions?: number; color?: string };
    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const bitset = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((bitset & Permission.MANAGE_ROLES) !== Permission.MANAGE_ROLES) return reply.forbidden();
    const role = await prisma.role.update({
      where: { id: roleId },
      data: { name, permissions, color },
    });
    return { role };
  });

  app.delete('/servers/:serverId/roles/:roleId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, roleId } = request.params as { serverId: string; roleId: string };
    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const bitset = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((bitset & Permission.MANAGE_ROLES) !== Permission.MANAGE_ROLES) return reply.forbidden();
    await prisma.role.delete({ where: { id: roleId } });
    return { success: true };
  });
}
