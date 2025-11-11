import type { FastifyInstance } from 'fastify';
import {
  WorkspaceCreateSchema,
  WorkspaceMemberInviteSchema,
  WorkspaceRoles,
} from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';
import { z } from 'zod';

const WorkspaceUpdateSchema = WorkspaceCreateSchema.partial();

function canManage(role: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.get('/workspaces', { preHandler: requireAuth }, async (request) => {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: request.user!.id },
      include: { workspace: true },
      orderBy: { workspace: { createdAt: 'asc' } },
    });

    return {
      workspaces: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        description: membership.workspace.description,
        role: membership.role,
        createdAt: membership.workspace.createdAt,
      })),
    };
  });

  app.post('/workspaces', { preHandler: requireAuth }, async (request) => {
    const payload = WorkspaceCreateSchema.parse(request.body ?? {});
    const workspace = await prisma.workspace.create({
      data: {
        name: payload.name,
        description: payload.description,
        ownerId: request.user!.id,
        members: {
          create: {
            userId: request.user!.id,
            role: 'OWNER',
          },
        },
      },
    });

    return { workspace };
  });

  app.get('/workspaces/:workspaceId', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.user!.id },
    });
    if (!membership) {
      return reply.forbidden();
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        },
        integrations: true,
      },
    });

    return {
      workspace,
    };
  });

  app.patch('/workspaces/:workspaceId', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const update = WorkspaceUpdateSchema.parse(request.body ?? {});
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.user!.id },
    });
    if (!membership || !canManage(membership.role)) {
      return reply.forbidden();
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: update,
    });
    return { workspace };
  });

  app.post('/workspaces/:workspaceId/members', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const payload = WorkspaceMemberInviteSchema.parse(request.body ?? {});

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.user!.id },
    });
    if (!membership || !canManage(membership.role)) {
      return reply.forbidden();
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return reply.notFound('User not found');
    }

    const existing = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (existing) {
      return { member: existing };
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: payload.role,
      },
      include: {
        user: true,
      },
    });

    return { member };
  });

  app.patch('/workspaces/:workspaceId/members/:memberId', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId, memberId } = request.params as { workspaceId: string; memberId: string };
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.user!.id },
    });
    if (!membership || membership.role !== 'OWNER') {
      return reply.forbidden();
    }

    const { role } = z
      .object({ role: z.enum(WorkspaceRoles) })
      .parse(request.body ?? {});

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true },
    });
    return { member: updated };
  });

  app.delete('/workspaces/:workspaceId/members/:memberId', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId, memberId } = request.params as { workspaceId: string; memberId: string };
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: request.user!.id },
    });
    if (!membership || !canManage(membership.role)) {
      return reply.forbidden();
    }

    const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
    if (!target) {
      return reply.notFound();
    }
    if (target.role === 'OWNER') {
      return reply.badRequest('Cannot remove the owner');
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });
    return { success: true };
  });
}
