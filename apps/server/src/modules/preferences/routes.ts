import type { FastifyInstance } from 'fastify';
import {
  NotificationSettingsSchema,
  OnboardingPreferenceSchema,
} from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

function withDefaults<T extends Record<string, unknown>>(value: T | null, defaults: T): T {
  if (!value) return defaults;
  return { ...defaults, ...value } as T;
}

const defaultPreferences = {
  role: 'Collaborator',
  interests: ['Productivity'],
  summaryFrequency: 'weekly',
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    digest: false,
  },
};

export async function registerPreferenceRoutes(app: FastifyInstance) {
  app.get('/preferences', { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
    });
    const preferences = withDefaults(user?.preferences as typeof defaultPreferences | null, defaultPreferences);
    const notifications = withDefaults(
      user?.notificationSettings as typeof defaultPreferences.notifications | null,
      defaultPreferences.notifications,
    );
    return {
      preferences,
      notifications,
    };
  });

  app.post('/preferences', { preHandler: requireAuth }, async (request) => {
    const payload = OnboardingPreferenceSchema.parse(request.body ?? {});
    const result = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        preferences: payload,
        notificationSettings: payload.notifications,
        onboarded: true,
      },
    });

    return {
      preferences: result.preferences,
      notifications: result.notificationSettings,
      onboarded: result.onboarded,
    };
  });

  app.patch('/preferences/notifications', { preHandler: requireAuth }, async (request) => {
    const notifications = NotificationSettingsSchema.parse(request.body ?? {});
    const result = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        notificationSettings: notifications,
      },
    });
    return { notifications: result.notificationSettings };
  });
}
