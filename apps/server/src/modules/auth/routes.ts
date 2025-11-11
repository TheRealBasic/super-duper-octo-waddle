import type { FastifyInstance } from 'fastify';
import {
  RegisterSchema,
  LoginSchema,
  NotificationSettingsSchema,
  OnboardingPreferenceSchema,
  OAuthRegisterSchema,
} from '@acme/shared';
import { hashPassword, verifyPassword } from '../../auth/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../auth/jwt.js';
import { redis } from '../../utils/redis.js';
import { prisma } from '../../utils/prisma.js';
import { randomUUID } from 'crypto';
import { requireAuth } from '../../middleware/auth.js';
import { verifyAppleIdToken, verifyGoogleIdToken } from '../../auth/oauth.js';

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

export async function registerAuthRoutes(app: FastifyInstance) {
  function serializeUser(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    onboarded: boolean;
    preferences: unknown;
    notificationSettings: unknown;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      onboarded: user.onboarded,
      preferences: user.preferences ?? null,
      notificationSettings: user.notificationSettings ?? null,
    };
  }

  app.post('/auth/register', async (request, reply) => {
    const data = RegisterSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return reply.conflict('Email already in use');
    }
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        onboarded: false,
        notificationSettings: NotificationSettingsSchema.parse({}),
      },
    });
    const sessionId = randomUUID();
    await redis.set(`session:${sessionId}`, user.id, 'EX', 60 * 60 * 24 * 30);
    const access = signAccessToken(user.id, sessionId);
    const refresh = signRefreshToken(user.id, sessionId);
    reply
      .setCookie(ACCESS_COOKIE, access, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: app.config.NODE_ENV === 'production',
        domain: app.config.COOKIE_DOMAIN,
      })
      .setCookie(REFRESH_COOKIE, refresh, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: app.config.NODE_ENV === 'production',
        domain: app.config.COOKIE_DOMAIN,
      });
    return { user: serializeUser(user) };
  });

  app.post('/auth/oauth', async (request, reply) => {
    const data = OAuthRegisterSchema.parse(request.body);

    let profile;
    try {
      if (data.provider === 'GOOGLE') {
        profile = verifyGoogleIdToken(data.idToken, { clientId: app.config.GOOGLE_CLIENT_ID });
      } else {
        profile = verifyAppleIdToken(data.idToken, { clientId: app.config.APPLE_CLIENT_ID });
      }
    } catch (error) {
      request.log.warn({ err: error }, 'Invalid OAuth token');
      return reply.unauthorized('Invalid OAuth token');
    }

    if (!profile.emailVerified) {
      return reply.unauthorized('Email must be verified');
    }

    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: data.provider,
          providerAccountId: profile.id,
        },
      },
      include: { user: true },
    });

    let user = existingAccount?.user ?? null;

    if (!user) {
      const userByEmail = await prisma.user.findUnique({ where: { email: profile.email } });

      if (userByEmail) {
        await prisma.oAuthAccount.upsert({
          where: {
            provider_providerAccountId: {
              provider: data.provider,
              providerAccountId: profile.id,
            },
          },
          update: {},
          create: {
            provider: data.provider,
            providerAccountId: profile.id,
            userId: userByEmail.id,
          },
        });
        user = userByEmail;
      } else {
        const randomPassword = await hashPassword(randomUUID());
        const fallbackName = profile.name?.trim() || profile.email.split('@')[0] || 'Guild User';
        const displayName = fallbackName.substring(0, 64);
        const normalizedName = displayName.length >= 2 ? displayName : 'Guild User';

        user = await prisma.user.create({
          data: {
            email: profile.email,
            passwordHash: randomPassword,
            displayName: normalizedName,
            avatarUrl: profile.avatarUrl,
            onboarded: false,
            notificationSettings: NotificationSettingsSchema.parse({}),
            accounts: {
              create: {
                provider: data.provider,
                providerAccountId: profile.id,
              },
            },
          },
        });
      }
    }

    if (profile.avatarUrl && !user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: profile.avatarUrl },
      });
    }

    const completeUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!completeUser) {
      return reply.internalServerError();
    }

    const sessionId = randomUUID();
    await redis.set(`session:${sessionId}`, completeUser.id, 'EX', 60 * 60 * 24 * 30);
    const access = signAccessToken(completeUser.id, sessionId);
    const refresh = signRefreshToken(completeUser.id, sessionId);
    reply
      .setCookie(ACCESS_COOKIE, access, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: app.config.NODE_ENV === 'production',
        domain: app.config.COOKIE_DOMAIN,
      })
      .setCookie(REFRESH_COOKIE, refresh, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: app.config.NODE_ENV === 'production',
        domain: app.config.COOKIE_DOMAIN,
      });

    return { user: serializeUser(completeUser) };
  });

  app.post('/auth/login', async (request, reply) => {
    const data = LoginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return reply.unauthorized('Invalid credentials');
    }
    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      return reply.unauthorized('Invalid credentials');
    }
    const sessionId = randomUUID();
    await redis.set(`session:${sessionId}`, user.id, 'EX', 60 * 60 * 24 * 30);
    const access = signAccessToken(user.id, sessionId);
    const refresh = signRefreshToken(user.id, sessionId);
    reply
      .setCookie(ACCESS_COOKIE, access, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: app.config.NODE_ENV === 'production',
        domain: app.config.COOKIE_DOMAIN,
      })
      .setCookie(REFRESH_COOKIE, refresh, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: app.config.NODE_ENV === 'production',
        domain: app.config.COOKIE_DOMAIN,
      });
    return { user: serializeUser(user) };
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const refresh = request.cookies[REFRESH_COOKIE];
    if (refresh) {
      try {
        const payload = verifyRefreshToken(refresh);
        await redis.del(`session:${payload.sessionId}`);
      } catch {
        // ignore
      }
    }
    reply
      .clearCookie(ACCESS_COOKIE, { path: '/' })
      .clearCookie(REFRESH_COOKIE, { path: '/' });
    return { success: true };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (!token) {
      return reply.unauthorized();
    }
    try {
      const payload = verifyRefreshToken(token);
      const sessionUserId = await redis.get(`session:${payload.sessionId}`);
      if (!sessionUserId || sessionUserId !== payload.sub) {
        return reply.unauthorized();
      }
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        return reply.unauthorized();
      }
      const access = signAccessToken(user.id, payload.sessionId);
      reply.setCookie(ACCESS_COOKIE, access, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: app.config.NODE_ENV === 'production',
        domain: app.config.COOKIE_DOMAIN,
      });
      return { user: serializeUser(user) };
    } catch {
      return reply.unauthorized();
    }
  });

  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) {
      return reply.notFound();
    }
    return { user: serializeUser(user) };
  });

  app.patch('/me', { preHandler: requireAuth }, async (request, reply) => {
    const { displayName, avatarUrl, preferences, notificationSettings } = request.body as {
      displayName?: string;
      avatarUrl?: string;
      preferences?: unknown;
      notificationSettings?: unknown;
    };

    if (preferences) {
      OnboardingPreferenceSchema.parse(preferences);
    }
    if (notificationSettings) {
      NotificationSettingsSchema.parse(notificationSettings);
    }
    const user = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        displayName,
        avatarUrl,
        preferences: preferences as object | undefined,
        notificationSettings: notificationSettings as object | undefined,
        onboarded: preferences ? true : undefined,
      },
    });
    return { user: serializeUser(user) };
  });
}
