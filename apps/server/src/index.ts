import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifySensible from '@fastify/sensible';
import Fastify from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './utils/prisma.js';
import { redis } from './utils/redis.js';
import { registerRateLimit } from './middleware/rate-limit.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerServerRoutes } from './modules/servers/routes.js';
import { registerChannelRoutes } from './modules/channels/routes.js';
import { registerMessageRoutes } from './modules/messages/routes.js';
import { registerDMRoutes } from './modules/dms/routes.js';
import { registerModerationRoutes } from './modules/moderation/routes.js';
import { registerSearchRoutes } from './modules/search/routes.js';
import { registerUploadRoutes } from './modules/uploads/routes.js';
import { registerRoleRoutes } from './modules/roles/routes.js';
import { registerPreferenceRoutes } from './modules/preferences/routes.js';
import { registerWorkspaceRoutes } from './modules/workspaces/routes.js';
import { registerAnalyticsRoutes } from './modules/analytics/routes.js';
import { registerIntegrationRoutes } from './modules/integrations/routes.js';
import { createRealtimeServer } from './realtime/server.js';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

async function buildServer() {
  const app = Fastify({
    logger,
  }).withTypeProvider<ZodTypeProvider>();

  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  await fs.mkdir(uploadDir, { recursive: true });

  app.decorate('config', env);
  app.decorate('prisma', prisma);
  app.decorate('redis', redis);

  await app.register(fastifySensible);
  await app.register(cookie, {
    cookieName: 'accessToken',
    secret: env.JWT_ACCESS_SECRET,
  });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  });

  await registerRateLimit(app);

  await registerAuthRoutes(app);
  await registerServerRoutes(app);
  await registerChannelRoutes(app);
  await registerMessageRoutes(app);
  await registerDMRoutes(app);
  await registerModerationRoutes(app);
  await registerSearchRoutes(app);
  await registerUploadRoutes(app);
  await registerRoleRoutes(app);
  await registerPreferenceRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerAnalyticsRoutes(app);
  await registerIntegrationRoutes(app);

  createRealtimeServer(app);

  return app;
}

buildServer()
  .then((app) =>
    app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
      logger.info(`Server ready on port ${env.PORT}`);
    }),
  )
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });

export type App = Awaited<ReturnType<typeof buildServer>>;
