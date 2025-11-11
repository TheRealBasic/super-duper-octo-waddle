import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  app.get('/analytics/summary', { preHandler: requireAuth }, async (request) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [serverMemberships, dmThreads, messagesWeek, workspaceMemberships, integrations, user] = await Promise.all([
      prisma.serverMember.count({ where: { userId: request.user!.id } }),
      prisma.dMParticipant.count({ where: { userId: request.user!.id } }),
      prisma.message.count({
        where: { authorId: request.user!.id, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.workspaceMember.count({ where: { userId: request.user!.id } }),
      prisma.integration.count({
        where: {
          workspace: {
            members: {
              some: {
                userId: request.user!.id,
              },
            },
          },
        },
      }),
      prisma.user.findUnique({ where: { id: request.user!.id } }),
    ]);

    const preferences = (user?.preferences as { interests?: string[]; summaryFrequency?: string } | null) ?? {};

    return {
      summary: {
        servers: serverMemberships,
        workspaces: workspaceMemberships,
        directMessageThreads: dmThreads,
        messagesThisWeek: messagesWeek,
        activeIntegrations: integrations,
        summaryFrequency: preferences.summaryFrequency ?? 'weekly',
        topInterests: preferences.interests ?? [],
      },
    };
  });
}
