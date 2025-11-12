import { createRequire } from 'node:module';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const require = createRequire(import.meta.url);

type PrismaClientConstructor = new (...args: any[]) => {
  $disconnect(): Promise<void>;
  [key: string]: unknown;
};

function resolvePrismaClient() {
  try {
    const prismaModule = require('@prisma/client') as { PrismaClient: PrismaClientConstructor };
    return prismaModule.PrismaClient;
  } catch (error) {
    const helpMessage =
      'Failed to load Prisma Client. Run "pnpm install" and "pnpm --filter server prisma generate" before starting the API server.';
    logger.error({ err: error }, helpMessage);
    throw new Error(helpMessage);
  }
}

const PrismaClient = resolvePrismaClient();

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected Prisma');
});
