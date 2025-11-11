import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected Prisma');
});
