import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../auth/jwt.js';
import { redis } from '../utils/redis.js';
import { prisma } from '../utils/prisma.js';

function unauthorized(message: string) {
  const error = new Error(message);
  (error as any).statusCode = 401;
  return error;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies['accessToken'];
  if (!token) {
    throw unauthorized('Unauthorized');
  }

  try {
    const payload = verifyAccessToken(token);
    const sessionKey = `session:${payload.sessionId}`;
    const sessionUserId = await redis.get(sessionKey);
    if (!sessionUserId || sessionUserId !== payload.sub) {
      throw unauthorized('Invalid session');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw unauthorized('User not found');
    }
    (request as any).user = user;
    (request as any).sessionId = payload.sessionId;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unauthorized');
    if (!(err as any).statusCode) {
      (err as any).statusCode = 401;
    }
    throw err;
  }
}

export type AuthenticatedRequest = FastifyRequest & {
  user: { id: string };
  sessionId: string;
};
