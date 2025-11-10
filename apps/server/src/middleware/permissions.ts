import type { FastifyReply } from 'fastify';
import { Permission } from '@acme/shared';
import type { AuthenticatedRequest } from './auth.js';
import { prisma } from '../utils/prisma.js';
import { computeMemberPermissions } from '../auth/permissions.js';

export function requireServerPermission(permission: Permission) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const serverId = request.params && (request.params as any).serverId;
    if (!serverId) {
      reply.code(400);
      throw new Error('Missing serverId');
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user.id },
      include: { roles: true, server: { include: { roles: true } } },
    });

    if (!member) {
      reply.code(403);
      throw new Error('Not a member');
    }

    const bitset = computeMemberPermissions(member, member.server.roles);
    if ((bitset & permission) !== permission) {
      reply.code(403);
      throw new Error('Insufficient permissions');
    }
  };
}
