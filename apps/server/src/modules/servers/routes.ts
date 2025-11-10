import type { FastifyInstance } from 'fastify';
import { CreateServerSchema, InviteCreateSchema, Permission, DEFAULT_MEMBER_PERMISSIONS, OWNER_PERMISSIONS } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';
import { randomUUID } from 'crypto';

export async function registerServerRoutes(app: FastifyInstance) {
  app.post('/servers', { preHandler: requireAuth }, async (request, reply) => {
    const data = CreateServerSchema.parse(request.body);
    const server = await prisma.server.create({
      data: {
        name: data.name,
        iconUrl: data.iconUrl,
        ownerId: request.user!.id,
        roles: {
          create: [
            {
              id: randomUUID(),
              name: 'Owner',
              position: 100,
              permissions: OWNER_PERMISSIONS,
            },
            {
              id: randomUUID(),
              name: 'Member',
              position: 1,
              permissions: DEFAULT_MEMBER_PERMISSIONS,
            },
          ],
        },
      },
      include: { roles: true },
    });

    const ownerRole = server.roles.find((role) => role.name === 'Owner');
    const memberRole = server.roles.find((role) => role.name === 'Member');

    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId: request.user!.id,
        roles: {
          create: [
            { roleId: ownerRole!.id },
            { roleId: memberRole!.id },
          ],
        },
      },
    });

    await prisma.channel.create({
      data: {
        serverId: server.id,
        name: 'general',
        type: 'TEXT',
        position: 1,
      },
    });

    return { server };
  });

  app.get('/servers', { preHandler: requireAuth }, async (request) => {
    const servers = await prisma.serverMember.findMany({
      where: { userId: request.user!.id },
      include: { server: true },
    });
    return { servers: servers.map((membership) => membership.server) };
  });

  app.get('/servers/:serverId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const membership = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: {
        server: {
          include: {
            channels: {
              orderBy: { position: 'asc' },
            },
            roles: true,
          },
        },
        roles: true,
      },
    });
    if (!membership) {
      return reply.forbidden();
    }
    return { server: membership.server };
  });

  app.delete('/servers/:serverId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.ownerId !== request.user!.id) {
      return reply.forbidden();
    }
    await prisma.server.delete({ where: { id: serverId } });
    return { success: true };
  });

  app.post('/servers/:serverId/invites', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const data = InviteCreateSchema.parse(request.body ?? {});

    const membership = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!membership) return reply.forbidden();
    const permissions = membership.roles.reduce((acc, role) => acc | role.role.permissions, 0);
    if ((permissions & Permission.MANAGE_GUILD) !== Permission.MANAGE_GUILD) {
      return reply.forbidden();
    }

    const invite = await prisma.invite.create({
      data: {
        serverId,
        code: randomUUID().slice(0, 8),
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        createdBy: request.user!.id,
      },
    });
    return { invite };
  });

  app.post('/invites/:code/accept', { preHandler: requireAuth }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const invite = await prisma.invite.findUnique({ where: { code }, include: { server: { include: { roles: true } } } });
    if (!invite) return reply.notFound();
    if (invite.expiresAt && invite.expiresAt < new Date()) return reply.gone();
    if (invite.maxUses && invite.uses >= invite.maxUses) return reply.forbidden();

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: invite.serverId, userId: request.user!.id },
      include: { roles: true },
    });

    if (!membership) {
      const memberRole = invite.server.roles.find((role) => role.permissions === DEFAULT_MEMBER_PERMISSIONS) ?? invite.server.roles.find((role) => role.name === 'Member');
      await prisma.serverMember.create({
        data: {
          serverId: invite.serverId,
          userId: request.user!.id,
          roles: memberRole
            ? {
                create: [{ roleId: memberRole.id }],
              }
            : undefined,
        },
      });
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    });

    return { success: true };
  });
}
