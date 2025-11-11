import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../auth/jwt.js';
import { redis } from '../utils/redis.js';
import { prisma } from '../utils/prisma.js';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies['accessToken'];
  if (!token) {
    reply.code(401);
    throw new Error('Unauthorized');
  }

  try {
    const payload = verifyAccessToken(token);
    const sessionKey = `session:${payload.sessionId}`;
    const sessionUserId = await redis.get(sessionKey);
    if (!sessionUserId || sessionUserId !== payload.sub) {
      reply.code(401);
      throw new Error('Invalid session');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      reply.code(401);
      throw new Error('User not found');
    }
    (request as any).user = user;
    (request as any).sessionId = payload.sessionId;
  } catch (error) {
    reply.code(401);
    throw error;
  }
}

export type AuthenticatedRequest = FastifyRequest & {
  user: { id: string };
  sessionId: string;
};
