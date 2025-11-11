import type { FastifyInstance } from 'fastify';
import { IntegrationCreateSchema } from '@acme/shared';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

const IntegrationUpdateSchema = z.object({
  settings: z.record(z.any()).optional(),
  accessToken: z.string().min(1).optional(),
});

function canManage(role: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

export async function registerIntegrationRoutes(app: FastifyInstance) {
  app.get('/integrations', { preHandler: requireAuth }, async (request) => {
    const { workspaceId } = z
      .object({ workspaceId: z.string().uuid().optional() })
      .parse(request.query ?? {});

    if (workspaceId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: request.user!.id },
      });
      if (!membership) {
        return { integrations: [] };
      }
      const integrations = await prisma.integration.findMany({ where: { workspaceId } });
      return { integrations };
    }

    const integrations = await prisma.integration.findMany({
      where: {
        workspace: {
          members: {
            some: { userId: request.user!.id },
          },
        },
      },
      include: { workspace: true },
    });
    return {
      integrations: integrations.map((integration) => ({
        id: integration.id,
        type: integration.type,
        workspaceId: integration.workspaceId,
        createdAt: integration.createdAt,
        workspaceName: integration.workspace.name,
      })),
    };
  });

  app.post('/integrations', { preHandler: requireAuth }, async (request, reply) => {
    const payload = IntegrationCreateSchema.parse(request.body ?? {});
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: payload.workspaceId, userId: request.user!.id },
    });
    if (!membership || !canManage(membership.role)) {
      return reply.forbidden();
    }

    const integration = await prisma.integration.create({
      data: {
        workspaceId: payload.workspaceId,
        type: payload.type,
        accessToken: payload.accessToken,
        settings: payload.settings,
      },
    });

    return { integration };
  });

  app.patch('/integrations/:integrationId', { preHandler: requireAuth }, async (request, reply) => {
    const { integrationId } = request.params as { integrationId: string };
    const update = IntegrationUpdateSchema.parse(request.body ?? {});
    const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) {
      return reply.notFound();
    }
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: integration.workspaceId, userId: request.user!.id },
    });
    if (!membership || !canManage(membership.role)) {
      return reply.forbidden();
    }

    const updated = await prisma.integration.update({
      where: { id: integrationId },
      data: update,
    });
    return { integration: updated };
  });

  app.delete('/integrations/:integrationId', { preHandler: requireAuth }, async (request, reply) => {
    const { integrationId } = request.params as { integrationId: string };
    const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) {
      return reply.notFound();
    }
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: integration.workspaceId, userId: request.user!.id },
    });
    if (!membership || !canManage(membership.role)) {
      return reply.forbidden();
    }

    await prisma.integration.delete({ where: { id: integrationId } });
    return { success: true };
  });
}
