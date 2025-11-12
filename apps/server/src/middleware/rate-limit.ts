import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';

function resolveRequestIdentity(req: FastifyRequest) {
  return req.user?.id ?? req.sessionId ?? req.ip;
}

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    redis: app.redis,
    keyGenerator: resolveRequestIdentity,
  });
}
