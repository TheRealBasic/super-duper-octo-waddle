import type { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    redis: app.redis,
    keyGenerator: (req) => req.user?.id ?? req.ip,
  });
}
