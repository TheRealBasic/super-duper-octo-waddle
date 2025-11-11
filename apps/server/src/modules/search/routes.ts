import type { FastifyInstance } from 'fastify';
import { SearchSchema } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get('/search', { preHandler: requireAuth }, async (request, reply) => {
    const query = SearchSchema.parse(request.query);
    if (query.scope === 'channel') {
      const channel = await prisma.channel.findUnique({ where: { id: query.id } });
      if (!channel) return reply.notFound();
      const membership = await prisma.serverMember.findFirst({
        where: { serverId: channel.serverId, userId: request.user!.id },
      });
      if (!membership) return reply.forbidden();
      const results = await prisma.$queryRaw<any[]>`
        SELECT id, content, "createdAt", "authorId"
        FROM "Message"
        WHERE "channelId" = ${query.id} AND to_tsvector('english', coalesce(content, '')) @@ plainto_tsquery('english', ${query.q})
        ORDER BY "createdAt" DESC
        LIMIT 50;
      `;
      return { results };
    }

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: query.id, userId: request.user!.id },
    });
    if (!membership) return reply.forbidden();

    const results = await prisma.$queryRaw<any[]>`
      SELECT id, content, "createdAt", "authorId", "channelId"
      FROM "Message"
      WHERE "channelId" IN (SELECT id FROM "Channel" WHERE "serverId" = ${query.id})
        AND to_tsvector('english', coalesce(content, '')) @@ plainto_tsquery('english', ${query.q})
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `;
    return { results };
  });
}
