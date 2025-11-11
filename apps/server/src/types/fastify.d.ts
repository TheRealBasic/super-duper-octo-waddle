import 'fastify';
import type { Env } from '../config/env';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
    prisma: PrismaClient;
    redis: Redis;
  }
  interface FastifyRequest {
    user?: { id: string };
    sessionId?: string;
  }
}
