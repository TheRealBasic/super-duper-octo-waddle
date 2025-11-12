#!/usr/bin/env bash
set -euo pipefail
ROOT=$(pwd)
cat <<'EOF' > '.env.example'
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/discord
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me-access-secret-change-me
JWT_REFRESH_SECRET=change-me-refresh-secret-change-me
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
COOKIE_DOMAIN=
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3001
UPLOAD_DIR=apps/server/uploads
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=120

EOF
cat <<'EOF' > '.gitignore'
node_modules
pnpm-lock.yaml
dist
build
coverage
.env
apps/server/uploads

EOF
mkdir -p '.vscode'
cat <<'EOF' > '.vscode/extensions.json'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}

EOF
cat <<'EOF' > 'Dockerfile.server'
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared
RUN corepack enable
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @acme/shared build
RUN pnpm --filter server build
CMD ["pnpm", "--filter", "server", "run", "dev"]

EOF
cat <<'EOF' > 'Dockerfile.web'
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN corepack enable
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "--filter", "web", "run", "dev"]

EOF
cat <<'EOF' > 'README.md'
# GuildChat Monorepo

GuildChat is a Discord-style collaboration platform implemented as a TypeScript monorepo. The stack includes a Fastify + Prisma backend, a Vite + React frontend, shared type packages, Dockerized infrastructure, and real-time Socket.IO messaging backed by Redis.

## Features

- Email/password authentication with bcrypt hashing and JWT access/refresh rotation (httpOnly cookies).
- Server (guild) management with invite links, role-based permissions, and channel creation.
- Direct messages (1:1 and group), presence state, typing indicators, and message reactions.
- File uploads with thumbnailing, message editing/deleting, and moderation endpoints (kick/ban).
- Full-text search over messages leveraging PostgreSQL trigram indices.
- Real-time messaging via Socket.IO using Redis pub/sub adapter for horizontal scaling.
- Tailwind-powered React interface with Zustand state management.
- WebRTC-powered voice and video calls for server voice channels and DM threads, signaled through Socket.IO.
- Comprehensive Docker Compose environment (PostgreSQL, Redis, MinIO-compatible storage stub, backend, frontend).

## Monorepo Structure

```
apps/
  server/          Fastify API + Prisma schema + Socket.IO gateway
  web/             React client (Vite, Tailwind, Zustand)
packages/
  config/          Shared ESLint, Prettier, and tsconfig presets
  shared/          Shared Zod schemas, permission constants, event names
collections/       REST client collections (HTTP file)
docs/              Architecture notes, ER diagram
scripts/           Utility scripts
```

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) 8+
- Docker & Docker Compose

### Bootstrap the repository

```bash
./bootstrap.sh
```

The bootstrap script recreates the full project structure with all files listed below.

### Environment Variables

Copy the template and adjust as needed:

```bash
cp .env.example .env
```

The backend expects matching variables at runtime (Docker compose wires them automatically).

### Install dependencies

```bash
pnpm install
```

### Database setup

```bash
pnpm -w run migrate
pnpm -w run seed
```

### Development servers

Start the entire stack (backend, frontend, Postgres, Redis, storage stub) with one command:

```bash
pnpm -w run dev
```

- API available at http://localhost:3001
- Web app available at http://localhost:5173

### Tests

```bash
pnpm -w run test
```

### Build for production

```bash
pnpm -w run build
```

## Docker Compose

`docker-compose.yml` provisions:

- `postgres`: PostgreSQL 15 with pg_trgm extension
- `redis`: Redis 7 for pub/sub and rate limiting
- `server`: Fastify application (hot reload in dev)
- `web`: Vite dev server or production build (depending on command)

Use `docker compose up --build` for a full containerized environment.

## API Documentation

- `collections/guildchat.http` contains ready-to-run REST examples for Insomnia/VS Code REST client.
- API follows REST endpoints described in the project brief (`/auth/*`, `/servers`, `/channels`, `/dms`, `/search`, `/moderation`, `/uploads`).

## ER Diagram

Refer to `docs/er-diagram.png` for the relational model. Key tables include `User`, `Server`, `ServerMember`, `Role`, `Channel`, `Message`, `Reaction`, `Invite`, and `Presence`.

## Scripts

- `pnpm -w run dev` – run backend + frontend concurrently.
- `pnpm -w run migrate` – apply Prisma migrations.
- `pnpm -w run seed` – populate development data (20 users, 3 servers, 200 messages per channel).
- `pnpm -w run test` – run Vitest suites.

## Additional Notes

- Presence and typing events are handled via Socket.IO; Redis ensures messages fan out across instances.
- Message uploads are stored on the filesystem (`apps/server/uploads`) with image thumbnailing via `sharp`.
- Rate limiting uses Fastify's rate-limit plugin tied into Redis token buckets.
- The seed script provides enough sample data to exercise search, reactions, and moderation flows.
- Voice/video media streams use browser WebRTC APIs with peer-to-peer mesh; Redis-backed signaling keeps participants in sync.

Enjoy exploring GuildChat!
EOF
mkdir -p 'apps/server'
cat <<'EOF' > 'apps/server/package.json'
{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts --splitting",
    "lint": "eslint 'src/**/*.ts'",
    "test": "vitest",
    "migrate": "prisma migrate deploy",
    "seed": "prisma db seed"
  },
  "dependencies": {
    "@acme/shared": "workspace:*",
    "@fastify/cookie": "9.3.1",
    "@fastify/cors": "9.0.1",
    "@fastify/multipart": "7.7.3",
    "@fastify/sensible": "5.6.0",
    "@fastify/static": "7.0.2",
    "@fastify/websocket": "8.3.0",
    "@prisma/client": "5.12.1",
    "@socket.io/redis-adapter": "8.2.1",
    "bcryptjs": "2.4.3",
    "cookie": "0.6.0",
    "dotenv": "16.4.5",
    "fastify": "4.26.2",
    "fastify-rate-limit": "7.9.0",
    "fastify-type-provider-zod": "4.0.1",
    "ioredis": "5.3.2",
    "jsonwebtoken": "9.0.2",
    "mime-types": "2.1.35",
    "pino": "8.17.0",
    "sharp": "0.33.2",
    "socket.io": "4.7.5",
    "uuid": "9.0.1",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "2.4.2",
    "@types/cookie": "0.5.4",
    "@types/jsonwebtoken": "9.0.5",
    "@types/mime-types": "2.1.4",
    "@types/node": "20.11.19",
    "@types/uuid": "9.0.7",
    "eslint": "8.57.0",
    "pino-pretty": "10.3.1",
    "prisma": "5.12.1",
    "tsup": "7.2.0",
    "tsx": "4.7.0",
    "typescript": "5.4.3",
    "vitest": "1.4.0"
  }
}

EOF
mkdir -p 'apps/server/prisma/migrations/20240318120000_init'
cat <<'EOF' > 'apps/server/prisma/migrations/20240318120000_init/migration.sql'
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE "ChannelType" AS ENUM ('TEXT', 'VOICE');
CREATE TYPE "PresenceStatus" AS ENUM ('online', 'idle', 'offline');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Server" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "iconUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "ServerMember" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" UUID NOT NULL REFERENCES "Server"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "nickname" TEXT,
  "isBanned" BOOLEAN DEFAULT FALSE,
  UNIQUE ("serverId", "userId")
);

CREATE TABLE "Role" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" UUID NOT NULL REFERENCES "Server"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "position" INTEGER NOT NULL,
  "permissions" INTEGER NOT NULL
);

CREATE TABLE "MemberRole" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL REFERENCES "ServerMember"("id") ON DELETE CASCADE,
  "roleId" UUID NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
  UNIQUE ("memberId", "roleId")
);

CREATE TABLE "Channel" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" UUID NOT NULL REFERENCES "Server"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" "ChannelType" NOT NULL DEFAULT 'TEXT',
  "position" INTEGER NOT NULL,
  "parentId" UUID REFERENCES "Channel"("id") ON DELETE SET NULL,
  "isPrivate" BOOLEAN DEFAULT FALSE,
  "slowMode" INTEGER DEFAULT 0
);

CREATE TABLE "ChannelPermissionOverride" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channelId" UUID NOT NULL REFERENCES "Channel"("id") ON DELETE CASCADE,
  "roleId" UUID REFERENCES "Role"("id") ON DELETE CASCADE,
  "memberId" UUID REFERENCES "ServerMember"("id") ON DELETE CASCADE,
  "allow" INTEGER DEFAULT 0,
  "deny" INTEGER DEFAULT 0
);

CREATE TABLE "Invite" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" UUID NOT NULL REFERENCES "Server"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL UNIQUE,
  "uses" INTEGER DEFAULT 0,
  "maxUses" INTEGER,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "createdBy" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "DMThread" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "isGroup" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "DMParticipant" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadId" UUID NOT NULL REFERENCES "DMThread"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("threadId", "userId")
);

CREATE TABLE "Message" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channelId" UUID REFERENCES "Channel"("id") ON DELETE CASCADE,
  "threadId" UUID REFERENCES "DMThread"("id") ON DELETE CASCADE,
  "authorId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "editedAt" TIMESTAMP WITH TIME ZONE,
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX "Message_channel_idx" ON "Message" ("channelId", "createdAt");
CREATE INDEX "Message_thread_idx" ON "Message" ("threadId", "createdAt");
CREATE INDEX "Message_content_search" ON "Message" USING GIN (to_tsvector('english', coalesce("content", '')));

CREATE TABLE "Attachment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" UUID NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL
);

CREATE TABLE "Reaction" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" UUID NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE ("messageId", "userId", "emoji")
);

CREATE TABLE "Presence" (
  "userId" UUID PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "status" "PresenceStatus" DEFAULT 'offline',
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "AuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" UUID REFERENCES "Server"("id") ON DELETE CASCADE,
  "actorId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "targetId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

EOF
mkdir -p 'apps/server/prisma'
cat <<'EOF' > 'apps/server/prisma/schema.prisma'
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  displayName  String
  avatarUrl    String?
  createdAt    DateTime  @default(now())
  serversOwned Server[]  @relation("ServerOwner")
  memberships  ServerMember[]
  messages     Message[]
  dmThreads    DMParticipant[]
  reactions    Reaction[]
  presence     Presence?
}

model Server {
  id        String         @id @default(uuid())
  ownerId   String
  owner     User           @relation("ServerOwner", fields: [ownerId], references: [id])
  name      String
  iconUrl   String?
  createdAt DateTime       @default(now())
  members   ServerMember[]
  roles     Role[]
  channels  Channel[]
  invites   Invite[]
  auditLogs AuditLog[]
}

model ServerMember {
  id        String    @id @default(uuid())
  serverId  String
  userId    String
  joinedAt  DateTime  @default(now())
  nickname  String?
  roles     MemberRole[]
  isBanned  Boolean   @default(false)

  server Server @relation(fields: [serverId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@unique([serverId, userId])
}

model Role {
  id          String   @id @default(uuid())
  serverId    String
  name        String
  color       String?
  position    Int
  permissions Int
  members     MemberRole[]
  server      Server @relation(fields: [serverId], references: [id])
}

model MemberRole {
  id       String @id @default(uuid())
  memberId String
  roleId   String
  member   ServerMember @relation(fields: [memberId], references: [id])
  role     Role         @relation(fields: [roleId], references: [id])

  @@unique([memberId, roleId])
}

model Channel {
  id         String    @id @default(uuid())
  serverId   String
  name       String
  type       ChannelType @default(TEXT)
  position   Int
  parentId   String?
  isPrivate  Boolean   @default(false)
  slowMode   Int       @default(0)
  messages   Message[]
  overrides  ChannelPermissionOverride[]
  server     Server    @relation(fields: [serverId], references: [id])
  parent     Channel?  @relation("ChannelChildren", fields: [parentId], references: [id])
  children   Channel[] @relation("ChannelChildren")
}

enum ChannelType {
  TEXT
  VOICE
}

model ChannelPermissionOverride {
  id        String  @id @default(uuid())
  channelId String
  roleId    String?
  memberId  String?
  allow     Int     @default(0)
  deny      Int     @default(0)

  channel Channel       @relation(fields: [channelId], references: [id])
  role    Role?         @relation(fields: [roleId], references: [id])
  member  ServerMember? @relation(fields: [memberId], references: [id])
}

model Invite {
  id        String   @id @default(uuid())
  serverId  String
  code      String   @unique
  uses      Int      @default(0)
  maxUses   Int?
  expiresAt DateTime?
  createdBy String
  createdAt DateTime @default(now())

  server Server @relation(fields: [serverId], references: [id])
}

model DMThread {
  id          String           @id @default(uuid())
  isGroup     Boolean          @default(false)
  createdAt   DateTime         @default(now())
  participants DMParticipant[]
  messages     Message[]
}

model DMParticipant {
  id       String   @id @default(uuid())
  threadId String
  userId   String
  thread   DMThread @relation(fields: [threadId], references: [id])
  user     User     @relation(fields: [userId], references: [id])

  @@unique([threadId, userId])
}

model Message {
  id         String    @id @default(uuid())
  channelId  String?
  threadId   String?
  authorId   String
  content    String?
  createdAt  DateTime  @default(now())
  editedAt   DateTime?
  deletedAt  DateTime?
  attachments Attachment[]
  reactions  Reaction[]

  channel Channel?  @relation(fields: [channelId], references: [id])
  thread  DMThread? @relation(fields: [threadId], references: [id])
  author  User      @relation(fields: [authorId], references: [id])

  @@index([channelId, createdAt])
  @@index([threadId, createdAt])
  @@index([content], type: Gin)
}

model Attachment {
  id        String  @id @default(uuid())
  messageId String
  url       String
  mime      String
  size      Int

  message Message @relation(fields: [messageId], references: [id])
}

model Reaction {
  id        String @id @default(uuid())
  messageId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([messageId, userId, emoji])
}

model Presence {
  userId    String   @id
  status    PresenceStatus @default(offline)
  updatedAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

enum PresenceStatus {
  online
  idle
  offline
}

model AuditLog {
  id        String   @id @default(uuid())
  serverId  String?
  actorId   String
  action    String
  targetId  String?
  metadata  Json?
  createdAt DateTime @default(now())
}

EOF
mkdir -p 'apps/server/prisma'
cat <<'EOF' > 'apps/server/prisma/seed.ts'
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import { DEFAULT_MEMBER_PERMISSIONS, OWNER_PERMISSIONS, ReactionEmojis } from '@acme/shared';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  await prisma.reaction.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.memberRole.deleteMany();
  await prisma.channelPermissionOverride.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.role.deleteMany();
  await prisma.serverMember.deleteMany();
  await prisma.server.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dMParticipant.deleteMany();
  await prisma.dMThread.deleteMany();

  const users = await Promise.all(
    Array.from({ length: 20 }).map(async (_, index) =>
      prisma.user.create({
        data: {
          email: `user${index + 1}@example.com`,
          passwordHash: await hashPassword('Password123!'),
          displayName: `User ${index + 1}`,
        },
      }),
    ),
  );

  for (let s = 0; s < 3; s++) {
    const owner = users[s];
    const server = await prisma.server.create({
      data: {
        name: `Server ${s + 1}`,
        ownerId: owner.id,
        roles: {
          create: [
            {
              id: randomUUID(),
              name: 'Owner',
              position: 100,
              permissions: OWNER_PERMISSIONS,
            },
            {
              id: randomUUID(),
              name: 'Member',
              position: 1,
              permissions: DEFAULT_MEMBER_PERMISSIONS,
            },
          ],
        },
      },
      include: { roles: true },
    });

    const ownerRole = server.roles.find((role) => role.name === 'Owner');
    const memberRole = server.roles.find((role) => role.name === 'Member');

    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId: owner.id,
        roles: {
          create: [
            { roleId: ownerRole!.id },
            { roleId: memberRole!.id },
          ],
        },
      },
    });

    const textChannels = await Promise.all(
      Array.from({ length: 3 }).map((_, index) =>
        prisma.channel.create({
          data: {
            serverId: server.id,
            name: `text-${index + 1}`,
            position: index + 1,
            type: 'TEXT',
          },
        }),
      ),
    );

    await Promise.all(
      Array.from({ length: 2 }).map((_, index) =>
        prisma.channel.create({
          data: {
            serverId: server.id,
            name: `voice-${index + 1}`,
            position: index + 1 + textChannels.length,
            type: 'VOICE',
          },
        }),
      ),
    );

    const members = users.slice(s * 5, s * 5 + 10);
    for (const member of members) {
      await prisma.serverMember.upsert({
        where: {
          serverId_userId: { serverId: server.id, userId: member.id },
        },
        update: {},
        create: {
          serverId: server.id,
          userId: member.id,
          roles: {
            create: memberRole
              ? [
                  {
                    roleId: memberRole.id,
                  },
                ]
              : [],
          },
        },
      });
    }

    for (const channel of textChannels) {
      for (let m = 0; m < 200; m++) {
        const author = members[(m + s) % members.length];
        const message = await prisma.message.create({
          data: {
            channelId: channel.id,
            authorId: author.id,
            content: `Sample message ${m + 1} in ${channel.name}`,
          },
        });
        if (m % 10 === 0) {
          await prisma.reaction.create({
            data: {
              messageId: message.id,
              userId: author.id,
              emoji: ReactionEmojis[m % ReactionEmojis.length],
            },
          });
        }
      }
    }
  }

  console.log('Seed data created');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
mkdir -p 'apps/server/src/auth'
cat <<'EOF' > 'apps/server/src/auth/jwt.ts'
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type JwtPayload = {
  sub: string;
  sessionId: string;
};

export function signAccessToken(userId: string, sessionId: string) {
  return jwt.sign({ sub: userId, sessionId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken(userId: string, sessionId: string) {
  return jwt.sign({ sub: userId, sessionId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

EOF
mkdir -p 'apps/server/src/auth'
cat <<'EOF' > 'apps/server/src/auth/password.ts'
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

EOF
mkdir -p 'apps/server/src/auth'
cat <<'EOF' > 'apps/server/src/auth/permissions.ts'
import type { Channel, ChannelPermissionOverride, MemberRole, Role, ServerMember } from '@prisma/client';
import { Permission } from '@acme/shared';

export function computeMemberPermissions(member: ServerMember & { roles: MemberRole[] }, roles: Role[]) {
  let bitset = 0;
  for (const memberRole of member.roles) {
    const role = roles.find((r) => r.id === memberRole.roleId);
    if (role) {
      bitset |= role.permissions;
    }
  }
  return bitset;
}

export function applyChannelOverrides(
  base: number,
  member: ServerMember & { roles: MemberRole[] },
  overrides: ChannelPermissionOverride[],
) {
  let allow = 0;
  let deny = 0;

  for (const override of overrides) {
    if (override.memberId === member.id) {
      allow |= override.allow;
      deny |= override.deny;
    }
    if (override.roleId && member.roles.some((role) => role.roleId === override.roleId)) {
      allow |= override.allow;
      deny |= override.deny;
    }
  }

  return (base & ~deny) | allow;
}

export function hasPermission(bitset: number, permission: Permission) {
  return (bitset & permission) === permission;
}

export function ensurePermission(bitset: number, required: Permission) {
  if (!hasPermission(bitset, required)) {
    const error = new Error('Forbidden');
    // @ts-expect-error add statusCode property for Fastify
    error.statusCode = 403;
    throw error;
  }
}

export function sortRoles(roles: Role[]) {
  return [...roles].sort((a, b) => b.position - a.position);
}

export function highestRole(roles: Role[]) {
  return sortRoles(roles)[0];
}

export function canModerate(actorRoles: Role[], targetRoles: Role[]) {
  const actor = highestRole(actorRoles);
  const target = highestRole(targetRoles);
  if (!actor) return false;
  if (!target) return true;
  return actor.position > target.position;
}

export function getDefaultTextChannel(serverId: string, channels: Channel[]) {
  return channels.find((channel) => channel.serverId === serverId && channel.type === 'TEXT');
}

EOF
mkdir -p 'apps/server/src/config'
cat <<'EOF' > 'apps/server/src/config/env.ts'
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('uploads'),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(120)
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;

EOF
mkdir -p 'apps/server/src/config'
cat <<'EOF' > 'apps/server/src/config/logger.ts'
import pino from 'pino';

export const logger = pino({
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
  level: process.env.LOG_LEVEL ?? 'info',
});

EOF
mkdir -p 'apps/server/src'
cat <<'EOF' > 'apps/server/src/index.ts'
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifySensible from '@fastify/sensible';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { createRealtimeServer } from './realtime/server.js';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildServer() {
  const app = Fastify({
    logger,
  }).withTypeProvider<ZodTypeProvider>();

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
    root: path.join(__dirname, '..', 'uploads'),
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

EOF
mkdir -p 'apps/server/src/middleware'
cat <<'EOF' > 'apps/server/src/middleware/auth.ts'
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

EOF
mkdir -p 'apps/server/src/middleware'
cat <<'EOF' > 'apps/server/src/middleware/permissions.ts'
import type { FastifyReply } from 'fastify';
import { Permission } from '@acme/shared';
import type { AuthenticatedRequest } from './auth.js';
import { prisma } from '../utils/prisma.js';
import { computeMemberPermissions } from '../auth/permissions.js';

export function requireServerPermission(permission: Permission) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const serverId = request.params && (request.params as any).serverId;
    if (!serverId) {
      reply.code(400);
      throw new Error('Missing serverId');
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user.id },
      include: { roles: true, server: { include: { roles: true } } },
    });

    if (!member) {
      reply.code(403);
      throw new Error('Not a member');
    }

    const bitset = computeMemberPermissions(member, member.server.roles);
    if ((bitset & permission) !== permission) {
      reply.code(403);
      throw new Error('Insufficient permissions');
    }
  };
}

EOF
mkdir -p 'apps/server/src/middleware'
cat <<'EOF' > 'apps/server/src/middleware/rate-limit.ts'
import type { FastifyInstance } from 'fastify';
import fastifyRateLimit from 'fastify-rate-limit';
import { env } from '../config/env.js';

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    redis: app.redis,
    keyGenerator: (req) => req.user?.id ?? req.ip,
  });
}

EOF
mkdir -p 'apps/server/src/modules/auth'
cat <<'EOF' > 'apps/server/src/modules/auth/routes.ts'
import type { FastifyInstance } from 'fastify';
import { RegisterSchema, LoginSchema } from '@acme/shared';
import { hashPassword, verifyPassword } from '../../auth/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../auth/jwt.js';
import { redis } from '../../utils/redis.js';
import { prisma } from '../../utils/prisma.js';
import { randomUUID } from 'crypto';
import { requireAuth } from '../../middleware/auth.js';

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

export async function registerAuthRoutes(app: FastifyInstance) {
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
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
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
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
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
      return { user: { id: user.id, email: user.email, displayName: user.displayName } };
    } catch {
      return reply.unauthorized();
    }
  });

  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) {
      return reply.notFound();
    }
    return { user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } };
  });

  app.patch('/me', { preHandler: requireAuth }, async (request, reply) => {
    const { displayName, avatarUrl } = request.body as { displayName?: string; avatarUrl?: string };
    const user = await prisma.user.update({
      where: { id: request.user!.id },
      data: { displayName, avatarUrl },
    });
    return { user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } };
  });
}

EOF
mkdir -p 'apps/server/src/modules/channels'
cat <<'EOF' > 'apps/server/src/modules/channels/routes.ts'
import type { FastifyInstance } from 'fastify';
import { CreateChannelSchema, Permission } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerChannelRoutes(app: FastifyInstance) {
  app.post('/channels', { preHandler: requireAuth }, async (request, reply) => {
    const data = CreateChannelSchema.parse(request.body);
    const member = await prisma.serverMember.findFirst({
      where: { serverId: data.serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const permissions = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((permissions & Permission.MANAGE_CHANNELS) !== Permission.MANAGE_CHANNELS) {
      return reply.forbidden();
    }

    const lastChannel = await prisma.channel.findFirst({
      where: { serverId: data.serverId },
      orderBy: { position: 'desc' },
    });

    const channel = await prisma.channel.create({
      data: {
        serverId: data.serverId,
        name: data.name,
        parentId: data.parentId ?? undefined,
        isPrivate: data.isPrivate ?? false,
        type: data.type,
        position: (lastChannel?.position ?? 0) + 1,
      },
    });

    return { channel };
  });
}
EOF
mkdir -p 'apps/server/src/modules/dms'
cat <<'EOF' > 'apps/server/src/modules/dms/routes.ts'
import type { FastifyInstance } from 'fastify';
import { DMThreadCreateSchema, MessageSchema } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerDMRoutes(app: FastifyInstance) {
  app.get('/dms', { preHandler: requireAuth }, async (request) => {
    const threads = await prisma.dMParticipant.findMany({
      where: { userId: request.user!.id },
      include: { thread: { include: { participants: { include: { user: true } } } } },
    });
    return {
      threads: threads.map((entry) => ({
        id: entry.thread.id,
        isGroup: entry.thread.isGroup,
        participants: entry.thread.participants.map((p) => ({ id: p.userId, displayName: p.user.displayName })),
      })),
    };
  });

  app.post('/dms', { preHandler: requireAuth }, async (request, reply) => {
    const payload = DMThreadCreateSchema.parse(request.body);
    const participantIds = Array.from(new Set([request.user!.id, ...payload.userIds]));
    const isGroup = participantIds.length > 2;

    const existing = await prisma.dMParticipant.findFirst({
      where: {
        userId: request.user!.id,
        thread: {
          participants: {
            every: {
              userId: { in: participantIds },
            },
          },
        },
      },
      include: { thread: true },
    });

    if (existing) {
      return { thread: existing.thread };
    }

    const thread = await prisma.dMThread.create({
      data: {
        isGroup,
        participants: {
          createMany: {
            data: participantIds.map((userId) => ({ userId })),
          },
        },
      },
      include: { participants: { include: { user: true } } },
    });

    return {
      thread: {
        id: thread.id,
        isGroup: thread.isGroup,
        participants: thread.participants.map((p) => ({ id: p.userId, displayName: p.user.displayName })),
      },
    };
  });

  app.get('/dms/:threadId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const participant = await prisma.dMParticipant.findFirst({
      where: { threadId, userId: request.user!.id },
    });
    if (!participant) return reply.forbidden();

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      include: { attachments: true, reactions: true, author: true },
    });
    return { messages };
  });

  app.post('/dms/:threadId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const payload = MessageSchema.parse(request.body ?? {});
    if (!payload.content && payload.attachments.length === 0) {
      return reply.badRequest('Message content or attachment required');
    }
    const participant = await prisma.dMParticipant.findFirst({
      where: { threadId, userId: request.user!.id },
    });
    if (!participant) return reply.forbidden();

    const message = await prisma.message.create({
      data: {
        threadId,
        authorId: request.user!.id,
        content: payload.content,
        attachments: {
          createMany: {
            data: payload.attachments,
          },
        },
      },
      include: { attachments: true, reactions: true, author: true },
    });

    return { message };
  });
}

EOF
mkdir -p 'apps/server/src/modules/messages'
cat <<'EOF' > 'apps/server/src/modules/messages/routes.ts'
import type { FastifyInstance } from 'fastify';
import { MessageSchema, PaginationSchema } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerMessageRoutes(app: FastifyInstance) {
  app.get('/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const query = PaginationSchema.parse({
      limit: Number((request.query as any)?.limit ?? 50),
      before: (request.query as any)?.before,
    });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) return reply.notFound();
    if (channel.type !== 'TEXT') {
      return reply.badRequest('Channel does not support text messages');
    }

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId: request.user!.id },
    });
    if (!membership) return reply.forbidden();

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        ...(query.before ? { createdAt: { lt: await getMessageTimestamp(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: { attachments: true, reactions: true, author: true },
    });

    return { messages: messages.reverse() };
  });

  app.post('/channels/:channelId/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const payload = MessageSchema.parse(request.body ?? {});
    if (!payload.content && payload.attachments.length === 0) {
      return reply.badRequest('Message content or attachment required');
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return reply.notFound();
    if (channel.type !== 'TEXT') {
      return reply.badRequest('Channel does not support text messages');
    }

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: channel.serverId, userId: request.user!.id },
    });
    if (!membership) return reply.forbidden();

    const message = await prisma.message.create({
      data: {
        channelId,
        authorId: request.user!.id,
        content: payload.content,
        attachments: {
          createMany: { data: payload.attachments },
        },
      },
      include: { attachments: true, reactions: true, author: true },
    });

    return { message };
  });

  app.patch('/messages/:messageId', { preHandler: requireAuth }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const { content } = request.body as { content: string };
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return reply.notFound();
    if (message.authorId !== request.user!.id) return reply.forbidden();
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: { author: true },
    });
    return { message: updated };
  });

  app.delete('/messages/:messageId', { preHandler: requireAuth }, async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return reply.notFound();
    if (message.authorId !== request.user!.id) return reply.forbidden();
    const deleted = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null },
      include: { author: true },
    });
    return { message: deleted };
  });
}

async function getMessageTimestamp(messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  return message?.createdAt ?? new Date();
}
EOF
mkdir -p 'apps/server/src/modules/moderation'
cat <<'EOF' > 'apps/server/src/modules/moderation/routes.ts'
import type { FastifyInstance } from 'fastify';
import { Permission } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerModerationRoutes(app: FastifyInstance) {
  app.post('/moderation/kick', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, userId } = request.body as { serverId: string; userId: string };
    const moderator = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!moderator) return reply.forbidden();
    const permissions = moderator.roles.reduce((acc, role) => acc | role.role.permissions, 0);
    if ((permissions & Permission.KICK_MEMBERS) !== Permission.KICK_MEMBERS) return reply.forbidden();

    await prisma.serverMember.deleteMany({ where: { serverId, userId } });
    return { success: true };
  });

  app.post('/moderation/ban', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, userId, reason } = request.body as { serverId: string; userId: string; reason?: string };
    const moderator = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!moderator) return reply.forbidden();
    const permissions = moderator.roles.reduce((acc, role) => acc | role.role.permissions, 0);
    if ((permissions & Permission.BAN_MEMBERS) !== Permission.BAN_MEMBERS) return reply.forbidden();

    await prisma.serverMember.updateMany({
      where: { serverId, userId },
      data: { isBanned: true },
    });
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: request.user!.id,
        action: 'ban',
        targetId: userId,
        metadata: reason ? { reason } : undefined,
      },
    });
    return { success: true };
  });
}

EOF
mkdir -p 'apps/server/src/modules/roles'
cat <<'EOF' > 'apps/server/src/modules/roles/routes.ts'
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';
import { Permission } from '@acme/shared';

export async function registerRoleRoutes(app: FastifyInstance) {
  app.post('/servers/:serverId/roles', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const { name, permissions, color } = request.body as { name: string; permissions: number; color?: string };
    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const bitset = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((bitset & Permission.MANAGE_ROLES) !== Permission.MANAGE_ROLES) return reply.forbidden();
    const position = ((await prisma.role.findFirst({ where: { serverId }, orderBy: { position: 'desc' } }))?.position ?? 0) + 1;
    const role = await prisma.role.create({
      data: {
        serverId,
        name,
        permissions,
        color,
        position,
      },
    });
    return { role };
  });

  app.patch('/servers/:serverId/roles/:roleId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, roleId } = request.params as { serverId: string; roleId: string };
    const { name, permissions, color } = request.body as { name?: string; permissions?: number; color?: string };
    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const bitset = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((bitset & Permission.MANAGE_ROLES) !== Permission.MANAGE_ROLES) return reply.forbidden();
    const role = await prisma.role.update({
      where: { id: roleId },
      data: { name, permissions, color },
    });
    return { role };
  });

  app.delete('/servers/:serverId/roles/:roleId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId, roleId } = request.params as { serverId: string; roleId: string };
    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return reply.forbidden();
    const bitset = member.roles.reduce((acc, r) => acc | r.role.permissions, 0);
    if ((bitset & Permission.MANAGE_ROLES) !== Permission.MANAGE_ROLES) return reply.forbidden();
    await prisma.role.delete({ where: { id: roleId } });
    return { success: true };
  });
}

EOF
mkdir -p 'apps/server/src/modules/search'
cat <<'EOF' > 'apps/server/src/modules/search/routes.ts'
import type { FastifyInstance } from 'fastify';
import { SearchSchema } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get('/search', { preHandler: requireAuth }, async (request, reply) => {
    const query = SearchSchema.parse(request.query);
    if (query.scope === 'channel') {
      const channel = await prisma.channel.findUnique({ where: { id: query.id } });
      if (!channel) return reply.notFound();
      const membership = await prisma.serverMember.findFirst({
        where: { serverId: channel.serverId, userId: request.user!.id },
      });
      if (!membership) return reply.forbidden();
      const results = await prisma.$queryRaw<any[]>`
        SELECT id, content, "createdAt", "authorId"
        FROM "Message"
        WHERE "channelId" = ${query.id} AND to_tsvector('english', coalesce(content, '')) @@ plainto_tsquery('english', ${query.q})
        ORDER BY "createdAt" DESC
        LIMIT 50;
      `;
      return { results };
    }

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: query.id, userId: request.user!.id },
    });
    if (!membership) return reply.forbidden();

    const results = await prisma.$queryRaw<any[]>`
      SELECT id, content, "createdAt", "authorId", "channelId"
      FROM "Message"
      WHERE "channelId" IN (SELECT id FROM "Channel" WHERE "serverId" = ${query.id})
        AND to_tsvector('english', coalesce(content, '')) @@ plainto_tsquery('english', ${query.q})
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `;
    return { results };
  });
}

EOF
mkdir -p 'apps/server/src/modules/servers'
cat <<'EOF' > 'apps/server/src/modules/servers/routes.ts'
import type { FastifyInstance } from 'fastify';
import { CreateServerSchema, InviteCreateSchema, Permission, DEFAULT_MEMBER_PERMISSIONS, OWNER_PERMISSIONS } from '@acme/shared';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../utils/prisma.js';
import { randomUUID } from 'crypto';

export async function registerServerRoutes(app: FastifyInstance) {
  app.post('/servers', { preHandler: requireAuth }, async (request, reply) => {
    const data = CreateServerSchema.parse(request.body);
    const server = await prisma.server.create({
      data: {
        name: data.name,
        iconUrl: data.iconUrl,
        ownerId: request.user!.id,
        roles: {
          create: [
            {
              id: randomUUID(),
              name: 'Owner',
              position: 100,
              permissions: OWNER_PERMISSIONS,
            },
            {
              id: randomUUID(),
              name: 'Member',
              position: 1,
              permissions: DEFAULT_MEMBER_PERMISSIONS,
            },
          ],
        },
      },
      include: { roles: true },
    });

    const ownerRole = server.roles.find((role) => role.name === 'Owner');
    const memberRole = server.roles.find((role) => role.name === 'Member');

    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId: request.user!.id,
        roles: {
          create: [
            { roleId: ownerRole!.id },
            { roleId: memberRole!.id },
          ],
        },
      },
    });

    await prisma.channel.create({
      data: {
        serverId: server.id,
        name: 'general',
        type: 'TEXT',
        position: 1,
      },
    });

    await prisma.channel.create({
      data: {
        serverId: server.id,
        name: 'Voice Lounge',
        type: 'VOICE',
        position: 2,
      },
    });

    return { server };
  });

  app.get('/servers', { preHandler: requireAuth }, async (request) => {
    const servers = await prisma.serverMember.findMany({
      where: { userId: request.user!.id },
      include: { server: true },
    });
    return { servers: servers.map((membership) => membership.server) };
  });

  app.get('/servers/:serverId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const membership = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: {
        server: {
          include: {
            channels: {
              orderBy: { position: 'asc' },
            },
            roles: true,
          },
        },
        roles: true,
      },
    });
    if (!membership) {
      return reply.forbidden();
    }
    return { server: membership.server };
  });

  app.delete('/servers/:serverId', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.ownerId !== request.user!.id) {
      return reply.forbidden();
    }
    await prisma.server.delete({ where: { id: serverId } });
    return { success: true };
  });

  app.post('/servers/:serverId/invites', { preHandler: requireAuth }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const data = InviteCreateSchema.parse(request.body ?? {});

    const membership = await prisma.serverMember.findFirst({
      where: { serverId, userId: request.user!.id },
      include: { roles: { include: { role: true } } },
    });
    if (!membership) return reply.forbidden();
    const permissions = membership.roles.reduce((acc, role) => acc | role.role.permissions, 0);
    if ((permissions & Permission.MANAGE_GUILD) !== Permission.MANAGE_GUILD) {
      return reply.forbidden();
    }

    const invite = await prisma.invite.create({
      data: {
        serverId,
        code: randomUUID().slice(0, 8),
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        createdBy: request.user!.id,
      },
    });
    return { invite };
  });

  app.post('/invites/:code/accept', { preHandler: requireAuth }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const invite = await prisma.invite.findUnique({ where: { code }, include: { server: { include: { roles: true } } } });
    if (!invite) return reply.notFound();
    if (invite.expiresAt && invite.expiresAt < new Date()) return reply.gone();
    if (invite.maxUses && invite.uses >= invite.maxUses) return reply.forbidden();

    const membership = await prisma.serverMember.findFirst({
      where: { serverId: invite.serverId, userId: request.user!.id },
      include: { roles: true },
    });

    if (!membership) {
      const memberRole = invite.server.roles.find((role) => role.permissions === DEFAULT_MEMBER_PERMISSIONS) ?? invite.server.roles.find((role) => role.name === 'Member');
      await prisma.serverMember.create({
        data: {
          serverId: invite.serverId,
          userId: request.user!.id,
          roles: memberRole
            ? {
                create: [{ roleId: memberRole.id }],
              }
            : undefined,
        },
      });
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    });

    return { success: true };
  });
}
EOF
mkdir -p 'apps/server/src/modules/uploads'
cat <<'EOF' > 'apps/server/src/modules/uploads/routes.ts'
import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import mime from 'mime-types';
import { requireAuth } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { UploadPolicy } from '@acme/shared';

export async function registerUploadRoutes(app: FastifyInstance) {
  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  await fs.mkdir(uploadDir, { recursive: true });

  app.post('/uploads', { preHandler: requireAuth }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.badRequest('No file');
    if (data.file.truncated) return reply.badRequest('File too large');
    if (data.file.bytesRead > UploadPolicy.maxSize) return reply.badRequest('File too large');

    const buffer = await data.toBuffer();
    const mimeType = data.mimetype;
    if (!UploadPolicy.allowedMime.includes(mimeType)) {
      return reply.badRequest('Unsupported file type');
    }

    const ext = mime.extension(mimeType) ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    if (mimeType.startsWith('image/')) {
      const thumbName = `${randomUUID()}-thumb.${ext}`;
      const thumbPath = path.join(uploadDir, thumbName);
      await sharp(buffer).resize(256, 256, { fit: 'inside' }).toFile(thumbPath);
    }

    const url = `/uploads/${filename}`;
    return { url };
  });
}

EOF
mkdir -p 'apps/server/src/realtime'
cat <<'EOF' > 'apps/server/src/realtime/server.ts'
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import { redis, redisSubscriber } from '../utils/redis.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { prisma } from '../utils/prisma.js';
import {
  PresenceUpdateSchema,
  TypingEventSchema,
  CreateMessageSchema,
  ReactionSchema,
  RTCJoinSchema,
  RTCLeaveSchema,
  RTCSignalSchema,
  RTCMediaUpdateSchema,
} from '@acme/shared';
import cookie from 'cookie';

export function createRealtimeServer(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    path: '/realtime',
    cors: {
      origin: app.config.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.adapter(createAdapter(redis, redisSubscriber));

  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || cookie.parse(socket.handshake.headers.cookie ?? '').accessToken;
      if (!rawToken) return next(new Error('Unauthorized'));
      const payload = verifyAccessToken(rawToken);
      const sessionUserId = await redis.get(`session:${payload.sessionId}`);
      if (sessionUserId !== payload.sub) return next(new Error('Unauthorized'));
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return next(new Error('Unauthorized'));
      (socket.data as any).user = user;
      (socket.data as any).sessionId = payload.sessionId;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  const voiceRooms = new Map<string, Set<string>>();
  const voiceVideoState = new Map<string, Map<string, boolean>>();

  function roomKeyFromPayload(payload: { channelId?: string; threadId?: string }) {
    if (payload.channelId) {
      return { key: `voice:channel:${payload.channelId}`, room: { channelId: payload.channelId } };
    }
    if (payload.threadId) {
      return { key: `voice:thread:${payload.threadId}`, room: { threadId: payload.threadId } };
    }
    throw new Error('Invalid room');
  }

  function deserializeRoomKey(key: string) {
    if (key.startsWith('voice:channel:')) {
      return { channelId: key.split(':')[2] };
    }
    if (key.startsWith('voice:thread:')) {
      return { threadId: key.split(':')[2] };
    }
    return {};
  }

  async function ensureVoiceJoin(payload: { channelId?: string; threadId?: string }, userId: string) {
    if (payload.channelId) {
      const channel = await prisma.channel.findUnique({ where: { id: payload.channelId } });
      if (!channel || channel.type !== 'VOICE') {
        throw new Error('Invalid channel');
      }
      const membership = await prisma.serverMember.findFirst({
        where: { serverId: channel.serverId, userId },
      });
      if (!membership) {
        throw new Error('Forbidden');
      }
      return roomKeyFromPayload(payload);
    }
    if (payload.threadId) {
      const thread = await prisma.dMThread.findUnique({
        where: { id: payload.threadId },
        include: { participants: true },
      });
      if (!thread) {
        throw new Error('Invalid thread');
      }
      const isParticipant = thread.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        throw new Error('Forbidden');
      }
      return roomKeyFromPayload(payload);
    }
    throw new Error('Invalid room');
  }

  io.on('connection', (socket) => {
    const user = (socket.data as any).user;

    socket.join(`user:${user.id}`);
    const joinedVoiceRooms = new Set<string>();

    socket.on('presence.update', async (payload) => {
      const parsed = PresenceUpdateSchema.safeParse(payload);
      if (!parsed.success) return;
      await prisma.presence.upsert({
        where: { userId: user.id },
        update: { status: parsed.data.status, updatedAt: new Date() },
        create: { userId: user.id, status: parsed.data.status },
      });
      io.emit('presence.state', { userId: user.id, status: parsed.data.status });
    });

    socket.on('typing.start', async (payload) => {
      const parsed = TypingEventSchema.safeParse(payload);
      if (!parsed.success) return;
      io.to(parsed.data.channelId ?? parsed.data.threadId ?? '').emit('typing', {
        userId: user.id,
        ...parsed.data,
      });
    });

    socket.on('channel.join', (channelId: string) => {
      socket.join(channelId);
    });

    socket.on('channel.leave', (channelId: string) => {
      socket.leave(channelId);
    });

    socket.on('message.create', async (payload, callback) => {
      const parsed = CreateMessageSchema.safeParse(payload);
      if (!parsed.success) {
        callback?.({ error: 'Invalid payload' });
        return;
      }

      const message = await prisma.message.create({
        data: {
          channelId: parsed.data.channelId,
          threadId: parsed.data.threadId,
          authorId: user.id,
          content: parsed.data.content,
          attachments: {
            createMany: {
              data: parsed.data.attachments,
            },
          },
        },
        include: { attachments: true, reactions: true },
      });

      const target = message.channelId ?? message.threadId;
      if (target) io.to(target).emit('message.created', message);

      callback?.({ message });
    });

    socket.on('message.edit', async ({ messageId, content }) => {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });
      if (!message || message.authorId !== user.id) return;
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content, editedAt: new Date() },
      });
      const target = updated.channelId ?? updated.threadId;
      if (target) io.to(target).emit('message.updated', updated);
    });

    socket.on('message.delete', async ({ messageId }) => {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });
      if (!message || message.authorId !== user.id) return;
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), content: null },
      });
      const target = message.channelId ?? message.threadId;
      if (target) io.to(target).emit('message.deleted', { messageId });
    });

    socket.on('reaction.add', async (payload) => {
      const parsed = ReactionSchema.safeParse(payload);
      if (!parsed.success) return;
      await prisma.reaction.upsert({
        where: {
          messageId_userId_emoji: {
            messageId: parsed.data.messageId,
            userId: user.id,
            emoji: parsed.data.emoji,
          },
        },
        update: {},
        create: {
          messageId: parsed.data.messageId,
          userId: user.id,
          emoji: parsed.data.emoji,
        },
      });
      const count = await prisma.reaction.count({
        where: { messageId: parsed.data.messageId, emoji: parsed.data.emoji },
      });
      io.emit('reaction.updated', {
        messageId: parsed.data.messageId,
        emoji: parsed.data.emoji,
        count,
        userId: user.id,
      });
    });

    socket.on('reaction.remove', async (payload) => {
      const parsed = ReactionSchema.safeParse(payload);
      if (!parsed.success) return;
      await prisma.reaction.deleteMany({
        where: { messageId: parsed.data.messageId, userId: user.id, emoji: parsed.data.emoji },
      });
      const count = await prisma.reaction.count({
        where: { messageId: parsed.data.messageId, emoji: parsed.data.emoji },
      });
      io.emit('reaction.updated', {
        messageId: parsed.data.messageId,
        emoji: parsed.data.emoji,
        count,
        userId: user.id,
      });
    });

    socket.on('rtc.join', async (payload) => {
      const parsed = RTCJoinSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = await ensureVoiceJoin(parsed.data, user.id);
        joinedVoiceRooms.add(key);
        socket.join(key);
        const participants = voiceRooms.get(key) ?? new Set<string>();
        voiceRooms.set(key, participants);
        participants.add(user.id);
        const videoState = voiceVideoState.get(key) ?? new Map<string, boolean>();
        voiceVideoState.set(key, videoState);
        const enableVideo = parsed.data.enableVideo ?? false;
        videoState.set(user.id, enableVideo);
        const others = Array.from(participants)
          .filter((id) => id !== user.id)
          .map((id) => ({ userId: id, videoEnabled: videoState.get(id) ?? false }));
        socket.emit('rtc.participants', { room, participants: others });
        socket.to(key).emit('rtc.participant-joined', { room, userId: user.id, videoEnabled: enableVideo });
      } catch (err) {
        app.log.warn({ err }, 'voice join failed');
      }
    });

    socket.on('rtc.leave', async (payload) => {
      const parsed = RTCLeaveSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = roomKeyFromPayload(parsed.data);
        if (!joinedVoiceRooms.has(key)) return;
        joinedVoiceRooms.delete(key);
        socket.leave(key);
        const participants = voiceRooms.get(key);
        if (participants) {
          participants.delete(user.id);
          if (participants.size === 0) {
            voiceRooms.delete(key);
          }
        }
        const videoState = voiceVideoState.get(key);
        videoState?.delete(user.id);
        socket.to(key).emit('rtc.participant-left', { room, userId: user.id });
      } catch (err) {
        app.log.warn({ err }, 'voice leave failed');
      }
    });

    socket.on('rtc.signal', async (payload) => {
      const parsed = RTCSignalSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = roomKeyFromPayload(parsed.data);
        if (!joinedVoiceRooms.has(key)) return;
        const participants = voiceRooms.get(key);
        if (!participants || !participants.has(parsed.data.targetUserId)) return;
        io.to(`user:${parsed.data.targetUserId}`).emit('rtc.signal', {
          room,
          fromUserId: user.id,
          payload: parsed.data.payload,
        });
      } catch (err) {
        app.log.warn({ err }, 'voice signal failed');
      }
    });

    socket.on('rtc.media-update', async (payload) => {
      const parsed = RTCMediaUpdateSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const { key, room } = roomKeyFromPayload(parsed.data);
        if (!joinedVoiceRooms.has(key)) return;
        const videoState = voiceVideoState.get(key) ?? new Map<string, boolean>();
        voiceVideoState.set(key, videoState);
        videoState.set(user.id, parsed.data.videoEnabled);
        socket.to(key).emit('rtc.media-updated', {
          room,
          userId: user.id,
          videoEnabled: parsed.data.videoEnabled,
        });
      } catch (err) {
        app.log.warn({ err }, 'voice media update failed');
      }
    });

    socket.on('disconnect', () => {
      for (const key of joinedVoiceRooms) {
        const room = deserializeRoomKey(key);
        const participants = voiceRooms.get(key);
        participants?.delete(user.id);
        if (participants && participants.size === 0) {
          voiceRooms.delete(key);
        }
        const videoState = voiceVideoState.get(key);
        videoState?.delete(user.id);
        socket.to(key).emit('rtc.participant-left', { room, userId: user.id });
      }
      joinedVoiceRooms.clear();
    });
  });

  return io;
}
EOF
mkdir -p 'apps/server/src/types'
cat <<'EOF' > 'apps/server/src/types/fastify.d.ts'
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

EOF
mkdir -p 'apps/server/src/utils'
cat <<'EOF' > 'apps/server/src/utils/prisma.ts'
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

EOF
mkdir -p 'apps/server/src/utils'
cat <<'EOF' > 'apps/server/src/utils/redis.ts'
import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const redisSubscriber = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

EOF
mkdir -p 'apps/server/tests'
cat <<'EOF' > 'apps/server/tests/auth.test.ts'
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password';

describe('password hashing', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('Password123!');
    expect(hash).not.toBe('Password123!');
    const ok = await verifyPassword('Password123!', hash);
    expect(ok).toBe(true);
  });
});

EOF
mkdir -p 'apps/server'
cat <<'EOF' > 'apps/server/tsconfig.json'
{
  "extends": "../../packages/config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}

EOF
mkdir -p 'apps/server'
cat <<'EOF' > 'apps/server/vitest.config.ts'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});

EOF
mkdir -p 'apps/web'
cat <<'EOF' > 'apps/web/index.html'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GuildChat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

EOF
mkdir -p 'apps/web'
cat <<'EOF' > 'apps/web/package.json'
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "test": "vitest"
  },
  "dependencies": {
    "@acme/shared": "workspace:*",
    "@headlessui/react": "1.7.17",
    "@tanstack/react-query": "5.28.4",
    "axios": "1.6.7",
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.0",
    "lucide-react": "0.344.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-router-dom": "6.22.3",
    "socket.io-client": "4.7.5",
    "zustand": "4.5.2"
  },
  "devDependencies": {
    "@tailwindcss/forms": "0.5.7",
    "@types/react": "18.2.55",
    "@types/react-dom": "18.2.19",
    "@vitejs/plugin-react": "4.2.1",
    "autoprefixer": "10.4.18",
    "eslint": "8.57.0",
    "eslint-config-prettier": "9.1.0",
    "eslint-plugin-react-hooks": "4.6.0",
    "postcss": "8.4.35",
    "tailwindcss": "3.4.3",
    "typescript": "5.4.3",
    "vite": "5.1.5",
    "vitest": "1.4.0"
  }
}

EOF
mkdir -p 'apps/web'
cat <<'EOF' > 'apps/web/postcss.config.cjs'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

EOF
mkdir -p 'apps/web/src/components'
cat <<'EOF' > 'apps/web/src/components/MessageComposer.tsx'
import { FormEvent, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface MessageComposerProps {
  onSubmit: (content: string, file?: File) => Promise<void>;
}

export default function MessageComposer({ onSubmit }: MessageComposerProps) {
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() && !file) return;
    setLoading(true);
    await onSubmit(value, file);
    setValue('');
    setFile(undefined);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/5 p-4 flex items-center gap-3">
      <label className="p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer">
        <Paperclip className="w-5 h-5" />
        <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0])} />
      </label>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Message..."
        className="flex-1 bg-white/10 rounded px-3 py-2 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-accent rounded text-sm font-medium disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}

EOF
cat <<'EOF' > 'apps/web/src/components/VoiceRoom.tsx'
import { useEffect, useMemo, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';

type Participant = {
  userId: string;
  stream?: MediaStream;
  videoEnabled: boolean;
  isLocal?: boolean;
};

interface VoiceRoomProps {
  joined: boolean;
  joining: boolean;
  participants: Participant[];
  audioEnabled: boolean;
  videoEnabled: boolean;
  onJoinAudio: () => void;
  onJoinVideo: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

function ParticipantTile({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (participant.stream && videoRef.current) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
    }
  }, [participant.stream]);
  useEffect(() => {
    if (!participant.isLocal && participant.stream && audioRef.current) {
      audioRef.current.srcObject = participant.stream;
      const play = () => {
        audioRef.current?.play().catch(() => undefined);
      };
      play();
    }
  }, [participant.stream, participant.isLocal]);
  const label = participant.isLocal ? 'You' : participant.userId.slice(0, 8);
  return (
    <div className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      {participant.videoEnabled && participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="h-40 w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-md bg-white/10 text-sm text-white/70">
          {participant.isLocal ? 'Audio only' : 'Voice' }
        </div>
      )}
      {!participant.isLocal && <audio ref={audioRef} autoPlay hidden />}
      <div className="mt-2 text-center text-xs font-medium text-white/80">{label}</div>
    </div>
  );
}

export default function VoiceRoom(props: VoiceRoomProps) {
  const participantList = useMemo(() => props.participants, [props.participants]);
  if (!props.joined) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-white/70">Join the call to start talking with your friends.</p>
        <div className="flex gap-3">
          <button
            onClick={props.onJoinAudio}
            disabled={props.joining}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            <Phone className="h-4 w-4" /> Join Voice
          </button>
          <button
            onClick={props.onJoinVideo}
            disabled={props.joining}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
          >
            <Video className="h-4 w-4" /> Join with Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex gap-3">
          <button
            onClick={props.onToggleMute}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            {props.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />} 
            {props.audioEnabled ? 'Mute' : 'Unmute'}
          </button>
          <button
            onClick={props.onToggleVideo}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            {props.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-400" />} 
            {props.videoEnabled ? 'Disable Video' : 'Enable Video'}
          </button>
        </div>
        <button
          onClick={props.onLeave}
          className="inline-flex items-center gap-2 rounded-full bg-red-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          <PhoneOff className="h-4 w-4" /> Leave
        </button>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
        {participantList.length === 0 && (
          <div className="col-span-full flex h-full items-center justify-center rounded-lg border border-dashed border-white/20 text-sm text-white/60">
            Waiting for others to join…
          </div>
        )}
        {participantList.map((participant) => (
          <ParticipantTile key={participant.userId} participant={participant} />
        ))}
      </div>
    </div>
  );
}
EOF
mkdir -p 'apps/web/src/components'
cat <<'EOF' > 'apps/web/src/components/MessageList.tsx'
import { useMemo } from 'react';

interface Message {
  id: string;
  author: { displayName: string };
  content?: string;
  createdAt: string;
  deletedAt?: string;
}

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const sorted = useMemo(() => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [messages]);
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {sorted.map((message) => (
        <div key={message.id} className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">{message.author.displayName}</span>
            <span className="text-xs text-white/40">{new Date(message.createdAt).toLocaleTimeString()}</span>
          </div>
          <p className="text-sm text-white/90 whitespace-pre-wrap">{message.deletedAt ? 'Deleted message' : message.content}</p>
        </div>
      ))}
    </div>
  );
}

EOF
mkdir -p 'apps/web/src'
cat <<'EOF' > 'apps/web/src/index.css'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-surface text-white;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}

EOF
mkdir -p 'apps/web/src/layouts'
cat <<'EOF' > 'apps/web/src/layouts/AppLayout.tsx'
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useAppStore } from '../store/app';
import { useRealtimeStore } from '../store/realtime';
import { Plus, LogOut, MessageCircle, Hash, Mic } from 'lucide-react';
import { api } from '../lib/api';

export default function AppLayout() {
  const servers = useAppStore((state) => state.servers);
  const channels = useAppStore((state) => state.channels);
  const dmThreads = useAppStore((state) => state.dmThreads);
  const fetchServers = useAppStore((state) => state.fetchServers);
  const fetchServerDetail = useAppStore((state) => state.fetchServerDetail);
  const fetchDMs = useAppStore((state) => state.fetchDMs);
  const { user, logout } = useAuthStore();
  const connect = useRealtimeStore((state) => state.connect);
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServers();
    fetchDMs();
    connect();
  }, [fetchServers, fetchDMs, connect]);

  useEffect(() => {
    const serverId = params.serverId;
    if (serverId) {
      fetchServerDetail(serverId);
    }
  }, [params.serverId, fetchServerDetail]);

  useEffect(() => {
    if (!params.serverId && servers.length > 0) {
      const firstServer = servers[0];
      fetchServerDetail(firstServer.id).then(() => {
        const firstChannel = useAppStore.getState().channels[firstServer.id]?.[0];
        if (firstChannel) {
          navigate(`/servers/${firstServer.id}/channels/${firstChannel.id}`, { replace: true });
        }
      });
    }
  }, [params.serverId, servers, navigate, fetchServerDetail]);

  const currentServerId = params.serverId ?? servers[0]?.id;
  const serverChannels = currentServerId ? channels[currentServerId] ?? [] : [];

  async function handleCreateServer() {
    const name = prompt('Server name');
    if (!name) return;
    await api.post('/servers', { name });
    await fetchServers();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-white">
      <aside className="w-16 bg-sidebar border-r border-white/5 flex flex-col items-center py-4 space-y-4">
        {servers.map((server) => (
          <Link
            key={server.id}
            to={`/servers/${server.id}/channels/${channels[server.id]?.[0]?.id ?? ''}`}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              currentServerId === server.id ? 'bg-accent text-white' : 'bg-white/10'
            }`}
          >
            {server.name[0]}
          </Link>
        ))}
        <Link
          to={dmThreads[0] ? `/dms/${dmThreads[0].id}` : '#'}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
            location.pathname.includes('/dms') ? 'bg-accent text-white' : 'bg-white/10'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
        </Link>
        <button
          onClick={handleCreateServer}
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 hover:bg-white/20"
        >
          <Plus className="w-5 h-5" />
        </button>
      </aside>
      <aside className="w-72 bg-sidebar border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="font-semibold">{servers.find((s) => s.id === currentServerId)?.name ?? 'Servers'}</span>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <div className="p-3">
            <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Channels</h2>
            <ul className="space-y-1">
              {serverChannels.map((channel) => (
                <li key={channel.id}>
                  <Link
                    to={`/servers/${channel.serverId}/channels/${channel.id}`}
                    className={`block rounded px-3 py-2 text-sm transition ${
                      location.pathname.includes(channel.id) ? 'bg-accent/30 text-white' : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {channel.type === 'VOICE' ? <Mic className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                      <span>{channel.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-3 pb-3">
            <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Direct Messages</h2>
            <ul className="space-y-1">
              {dmThreads.map((thread) => (
                <li key={thread.id}>
                  <Link
                    to={`/dms/${thread.id}`}
                    className={`block rounded px-3 py-2 text-sm transition ${
                      location.pathname.includes(thread.id) ? 'bg-accent/30 text-white' : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {thread.participants.map((p) => p.displayName).join(', ')}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">{location.pathname.includes('dms') ? 'Direct Messages' : 'Channel'}</h1>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <span>{user?.displayName}</span>
            <button onClick={logout} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
EOF
mkdir -p 'apps/web/src/layouts'
cat <<'EOF' > 'apps/web/src/layouts/AuthLayout.tsx'
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function AuthLayout() {
  const { user, status } = useAuthStore();
  if (status === 'authenticated' && user) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-white">
      <div className="w-full max-w-md rounded-xl bg-sidebar p-8 shadow-2xl">
        <Outlet />
      </div>
    </div>
  );
}

EOF
mkdir -p 'apps/web/src/lib'
cat <<'EOF' > 'apps/web/src/lib/api.ts'
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = '/api';

export const api = axios;

EOF
mkdir -p 'apps/web/src'
cat <<'EOF' > 'apps/web/src/main.tsx'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>,
);

EOF
mkdir -p 'apps/web/src/pages'
cat <<'EOF' > 'apps/web/src/pages/DMView.tsx'
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import { api } from '../lib/api';
import { useVoiceStore } from '../store/voice';
import VoiceRoom from '../components/VoiceRoom';

interface Message {
  id: string;
  content?: string;
  createdAt: string;
  deletedAt?: string;
  author: { displayName: string };
}

export default function DMView() {
  const { threadId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const {
    currentRoom,
    participants,
    audioEnabled,
    videoEnabled,
    joining,
    joinThread,
    leave,
    toggleMute,
    toggleVideo,
  } = useVoiceStore((state) => ({
    currentRoom: state.currentRoom,
    participants: state.participants,
    audioEnabled: state.audioEnabled,
    videoEnabled: state.videoEnabled,
    joining: state.joining,
    joinThread: state.joinThread,
    leave: state.leave,
    toggleMute: state.toggleMute,
    toggleVideo: state.toggleVideo,
  }));
  const joined = currentRoom?.threadId === threadId;
  const participantList = useMemo(() => Object.values(participants), [participants]);

  async function loadMessages() {
    if (!threadId) return;
    const { data } = await api.get(`/dms/${threadId}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    loadMessages();
  }, [threadId]);

  useEffect(() => {
    if (currentRoom?.threadId && currentRoom.threadId !== threadId) {
      void leave();
    }
  }, [currentRoom?.threadId, threadId, leave]);

  async function handleSend(content: string, file?: File) {
    if (!threadId) return;
    let attachments: { url: string; mime: string; size: number }[] = [];
    if (file) {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      attachments = [
        {
          url: data.url,
          mime: file.type,
          size: file.size,
        },
      ];
    }
    const { data } = await api.post(`/dms/${threadId}/messages`, {
      content,
      attachments,
    });
    setMessages((prev) => [...prev, data.message]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 h-80 overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <VoiceRoom
          joined={Boolean(joined)}
          joining={joining}
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          participants={participantList}
          onJoinAudio={() => threadId && joinThread(threadId, false)}
          onJoinVideo={() => threadId && joinThread(threadId, true)}
          onLeave={() => void leave()}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <MessageList messages={messages} />
        <MessageComposer onSubmit={handleSend} />
      </div>
    </div>
  );
}
EOF
mkdir -p 'apps/web/src/pages'
cat <<'EOF' > 'apps/web/src/pages/LoginPage.tsx'
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await login({ email, password });
    navigate('/');
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Welcome back</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-white/70">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/70">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <button type="submit" className="w-full bg-accent py-2 rounded font-semibold">
          Login
        </button>
      </form>
      <p className="text-sm text-white/60 mt-4">
        Need an account?{' '}
        <Link to="/register" className="text-accent">
          Register
        </Link>
      </p>
    </div>
  );
}

EOF
mkdir -p 'apps/web/src/pages'
cat <<'EOF' > 'apps/web/src/pages/RegisterPage.tsx'
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function RegisterPage() {
  const register = useAuthStore((state) => state.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await register({ email, password, displayName });
    navigate('/');
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-white/70">Display name</label>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/70">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/70">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded bg-white/10 px-3 py-2 focus:outline-none"
            required
          />
        </div>
        <button type="submit" className="w-full bg-accent py-2 rounded font-semibold">
          Register
        </button>
      </form>
      <p className="text-sm text-white/60 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-accent">
          Login
        </Link>
      </p>
    </div>
  );
}

EOF
mkdir -p 'apps/web/src/pages'
cat <<'EOF' > 'apps/web/src/pages/ServerView.tsx'
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';
import { useVoiceStore } from '../store/voice';
import VoiceRoom from '../components/VoiceRoom';

interface Message {
  id: string;
  content?: string;
  createdAt: string;
  deletedAt?: string;
  author: { displayName: string };
}

export default function ServerView() {
  const { channelId, serverId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const channel = useAppStore(
    (state) =>
      (serverId && channelId && state.channels[serverId]?.find((c) => c.id === channelId)) || undefined,
  );
  const {
    currentRoom,
    participants,
    audioEnabled,
    videoEnabled,
    joining,
    joinChannel,
    leave,
    toggleMute,
    toggleVideo,
  } = useVoiceStore((state) => ({
    currentRoom: state.currentRoom,
    participants: state.participants,
    audioEnabled: state.audioEnabled,
    videoEnabled: state.videoEnabled,
    joining: state.joining,
    joinChannel: state.joinChannel,
    leave: state.leave,
    toggleMute: state.toggleMute,
    toggleVideo: state.toggleVideo,
  }));
  const joined = currentRoom?.channelId === channelId;
  const participantList = useMemo(() => Object.values(participants), [participants]);

  async function loadMessages() {
    if (!channelId || channel?.type !== 'TEXT') return;
    const { data } = await api.get(`/channels/${channelId}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    loadMessages();
  }, [channelId, channel?.type]);

  useEffect(() => {
    if (currentRoom?.channelId && currentRoom.channelId !== channelId) {
      void leave();
    }
  }, [currentRoom?.channelId, channelId, leave]);

  async function handleSend(content: string, file?: File) {
    if (!channelId || channel?.type !== 'TEXT') return;
    let attachments: { url: string; mime: string; size: number }[] = [];
    if (file) {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      attachments = [
        {
          url: data.url,
          mime: file.type,
          size: file.size,
        },
      ];
    }
    const { data } = await api.post(`/channels/${channelId}/messages`, {
      content,
      attachments,
    });
    setMessages((prev) => [...prev, data.message]);
  }

  if (channel?.type === 'VOICE' && channelId) {
    return (
      <VoiceRoom
        joined={joined}
        joining={joining}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        participants={participantList}
        onJoinAudio={() => joinChannel(channelId, false)}
        onJoinVideo={() => joinChannel(channelId, true)}
        onLeave={() => void leave()}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} />
      <MessageComposer onSubmit={handleSend} />
    </div>
  );
}
EOF
mkdir -p 'apps/web/src/routes'
cat <<'EOF' > 'apps/web/src/routes/index.tsx'
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ServerView from '../pages/ServerView';
import DMView from '../pages/DMView';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, status, hydrate } = useAuthStore();
  useEffect(() => {
    if (status === 'idle') hydrate();
  }, [status, hydrate]);

  if (status === 'idle' || status === 'loading') {
    return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="servers/:serverId/channels/:channelId" element={<ServerView />} />
        <Route path="dms/:threadId" element={<DMView />} />
        <Route index element={<Navigate to="/servers" replace />} />
      </Route>
    </Routes>
  );
}

EOF
mkdir -p 'apps/web/src/store'
cat <<'EOF' > 'apps/web/src/store/app.ts'
import { create } from 'zustand';
import { api } from '../lib/api';

type ServerSummary = {
  id: string;
  name: string;
  iconUrl?: string;
};

type ChannelSummary = {
  id: string;
  name: string;
  serverId: string;
  type: 'TEXT' | 'VOICE';
};

type ThreadSummary = {
  id: string;
  isGroup: boolean;
  participants: { id: string; displayName: string }[];
};

interface AppState {
  servers: ServerSummary[];
  channels: Record<string, ChannelSummary[]>;
  dmThreads: ThreadSummary[];
  loading: boolean;
  fetchServers: () => Promise<void>;
  fetchServerDetail: (serverId: string) => Promise<void>;
  fetchDMs: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  servers: [],
  channels: {},
  dmThreads: [],
  loading: false,
  async fetchServers() {
    set({ loading: true });
    const { data } = await api.get('/servers');
    set({ servers: data.servers, loading: false });
  },
  async fetchServerDetail(serverId) {
    const { data } = await api.get(`/servers/${serverId}`);
    set((state) => ({
      channels: {
        ...state.channels,
        [serverId]: data.server.channels,
      },
    }));
  },
  async fetchDMs() {
    const { data } = await api.get('/dms');
    set({ dmThreads: data.threads });
  },
}));
EOF
mkdir -p 'apps/web/src/store'
cat <<'EOF' > 'apps/web/src/store/auth.ts'
import { create } from 'zustand';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = '/api';

interface AuthState {
  user: { id: string; email: string; displayName: string; avatarUrl?: string } | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  async hydrate() {
    set({ status: 'loading' });
    try {
      const { data } = await axios.get('/me');
      set({ user: data.user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },
  async login(input) {
    set({ status: 'loading' });
    await axios.post('/auth/login', input);
    const { data } = await axios.get('/me');
    set({ user: data.user, status: 'authenticated' });
  },
  async register(input) {
    set({ status: 'loading' });
    await axios.post('/auth/register', input);
    const { data } = await axios.get('/me');
    set({ user: data.user, status: 'authenticated' });
  },
  async logout() {
    await axios.post('/auth/logout');
    set({ user: null, status: 'unauthenticated' });
  },
}));

EOF
mkdir -p 'apps/web/src/store'
cat <<'EOF' > 'apps/web/src/store/realtime.ts'
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { PresenceStatus } from '@acme/shared';

interface RealtimeState {
  socket?: Socket;
  typing: Record<string, Set<string>>;
  presence: Record<string, PresenceStatus>;
  connect: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  typing: {},
  presence: {},
  connect() {
    if (get().socket) return;
    const socket = io('/realtime', {
      withCredentials: true,
    });
    socket.on('presence.state', ({ userId, status }) => {
      set((state) => ({
        presence: {
          ...state.presence,
          [userId]: status,
        },
      }));
    });
    socket.on('typing', ({ channelId, userId }) => {
      set((state) => {
        const key = channelId;
        const current = new Set(state.typing[key] ?? []);
        current.add(userId);
        return { typing: { ...state.typing, [key]: current } };
      });
      setTimeout(() => {
        set((state) => {
          const key = channelId;
          const current = new Set(state.typing[key] ?? []);
          current.delete(userId);
          return { typing: { ...state.typing, [key]: current } };
        });
      }, 3000);
    });
    set({ socket });
  },
}));

EOF
cat <<'EOF' > 'apps/web/src/store/voice.ts'
import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { useRealtimeStore } from './realtime';
import { useAuthStore } from './auth';

type VoiceRoom = { channelId?: string; threadId?: string };

type Participant = {
  userId: string;
  stream?: MediaStream;
  videoEnabled: boolean;
  isLocal?: boolean;
};

interface VoiceState {
  currentRoom?: VoiceRoom;
  participants: Record<string, Participant>;
  localStream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  joining: boolean;
  joinChannel: (channelId: string, enableVideo?: boolean) => Promise<void>;
  joinThread: (threadId: string, enableVideo?: boolean) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
}

const peerConnections = new Map<string, RTCPeerConnection>();
let socketBound = false;

export const useVoiceStore = create<VoiceState>((set, get) => ({
  currentRoom: undefined,
  participants: {},
  localStream: undefined,
  audioEnabled: false,
  videoEnabled: false,
  joining: false,
  async joinChannel(channelId, enableVideo = false) {
    await get().leave();
    set({ joining: true });
    try {
      const socket = await ensureSocket();
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: enableVideo });
      const stream = media;
      const user = useAuthStore.getState().user;
      const participants: Record<string, Participant> = {};
      if (user) {
        participants[user.id] = {
          userId: user.id,
          stream,
          videoEnabled: enableVideo,
          isLocal: true,
        };
      }
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      if (!enableVideo) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      peerConnections.clear();
      set({
        currentRoom: { channelId },
        localStream: stream,
        participants,
        audioEnabled: true,
        videoEnabled: enableVideo,
        joining: false,
      });
      socket.emit('rtc.join', { channelId, enableVideo });
    } catch (error) {
      console.error('Failed to join channel call', error);
      set({ joining: false });
    }
  },
  async joinThread(threadId, enableVideo = false) {
    await get().leave();
    set({ joining: true });
    try {
      const socket = await ensureSocket();
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: enableVideo });
      const stream = media;
      const user = useAuthStore.getState().user;
      const participants: Record<string, Participant> = {};
      if (user) {
        participants[user.id] = {
          userId: user.id,
          stream,
          videoEnabled: enableVideo,
          isLocal: true,
        };
      }
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      if (!enableVideo) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      peerConnections.clear();
      set({
        currentRoom: { threadId },
        localStream: stream,
        participants,
        audioEnabled: true,
        videoEnabled: enableVideo,
        joining: false,
      });
      socket.emit('rtc.join', { threadId, enableVideo });
    } catch (error) {
      console.error('Failed to join DM call', error);
      set({ joining: false });
    }
  },
  async leave() {
    const { currentRoom, localStream } = get();
    const socket = useRealtimeStore.getState().socket;
    if (currentRoom && socket) {
      socket.emit('rtc.leave', currentRoom);
    }
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();
    localStream?.getTracks().forEach((track) => track.stop());
    set({
      currentRoom: undefined,
      participants: {},
      localStream: undefined,
      audioEnabled: false,
      videoEnabled: false,
      joining: false,
    });
  },
  toggleMute() {
    const { localStream, audioEnabled } = get();
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !audioEnabled;
    });
    set({ audioEnabled: !audioEnabled });
  },
  async toggleVideo() {
    const { localStream, videoEnabled, currentRoom, participants } = get();
    if (!localStream || !currentRoom) return;
    const socket = useRealtimeStore.getState().socket;
    const userId = useAuthStore.getState().user?.id;
    if (videoEnabled) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.stop();
        localStream.removeTrack(track);
      }
      peerConnections.forEach((pc) => {
        pc.getSenders()
          .filter((sender) => sender.track?.kind === 'video')
          .forEach((sender) => sender.replaceTrack(null));
      });
      socket?.emit('rtc.media-update', { ...currentRoom, videoEnabled: false });
      if (userId) {
        set({
          videoEnabled: false,
          participants: {
            ...participants,
            [userId]: {
              ...(participants[userId] ?? { userId }),
              stream: localStream,
              videoEnabled: false,
              isLocal: true,
            },
          },
        });
      } else {
        set({ videoEnabled: false });
      }
    } else {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = media.getVideoTracks()[0];
        if (!newTrack) return;
        localStream.addTrack(newTrack);
        peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            pc.addTrack(newTrack, localStream);
          }
        });
        socket?.emit('rtc.media-update', { ...currentRoom, videoEnabled: true });
        if (userId) {
          set({
            videoEnabled: true,
            participants: {
              ...participants,
              [userId]: {
                ...(participants[userId] ?? { userId }),
                stream: localStream,
                videoEnabled: true,
                isLocal: true,
              },
            },
          });
        } else {
          set({ videoEnabled: true });
        }
      } catch (error) {
        console.error('Unable to enable video', error);
      }
    }
  },
}));

function roomMatches(a?: VoiceRoom, b?: VoiceRoom) {
  if (!a || !b) return false;
  if (a.channelId && b.channelId) return a.channelId === b.channelId;
  if (a.threadId && b.threadId) return a.threadId === b.threadId;
  return false;
}

function ensureSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    let socket = useRealtimeStore.getState().socket;
    if (!socket) {
      useRealtimeStore.getState().connect();
      socket = useRealtimeStore.getState().socket;
    }
    if (!socket) {
      reject(new Error('Realtime connection unavailable'));
      return;
    }
    if (!socketBound) {
      bindSocketEvents(socket);
      socketBound = true;
    }
    if (socket.connected) {
      resolve(socket);
    } else {
      socket.once('connect', () => resolve(socket!));
    }
  });
}

function bindSocketEvents(socket: Socket) {
  socket.on('rtc.participants', ({ room, participants }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    useVoiceStore.setState((prev) => {
      const next = { ...prev.participants };
      participants.forEach((participant: { userId: string; videoEnabled: boolean }) => {
        next[participant.userId] = {
          ...(next[participant.userId] ?? { userId: participant.userId }),
          videoEnabled: participant.videoEnabled,
        };
      });
      return { participants: next };
    });
    participants.forEach((participant: { userId: string }) => {
      createPeerConnection(participant.userId, true);
    });
  });

  socket.on('rtc.participant-joined', ({ room, userId, videoEnabled }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    useVoiceStore.setState((prev) => ({
      participants: {
        ...prev.participants,
        [userId]: {
          ...(prev.participants[userId] ?? { userId }),
          videoEnabled: Boolean(videoEnabled),
        },
      },
    }));
  });

  socket.on('rtc.participant-left', ({ room, userId }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    peerConnections.get(userId)?.close();
    peerConnections.delete(userId);
    useVoiceStore.setState((prev) => {
      const next = { ...prev.participants };
      delete next[userId];
      return { participants: next };
    });
  });

  socket.on('rtc.media-updated', ({ room, userId, videoEnabled }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    useVoiceStore.setState((prev) => ({
      participants: {
        ...prev.participants,
        [userId]: {
          ...(prev.participants[userId] ?? { userId }),
          videoEnabled: Boolean(videoEnabled),
          stream: prev.participants[userId]?.stream,
        },
      },
    }));
  });

  socket.on('rtc.signal', async ({ room, fromUserId, payload }) => {
    const state = useVoiceStore.getState();
    if (!roomMatches(room, state.currentRoom)) return;
    const pc = createPeerConnection(fromUserId, false);
    const sendSignal = (data: any) => {
      const activeRoom = useVoiceStore.getState().currentRoom;
      if (!activeRoom) return;
      socket.emit('rtc.signal', {
        ...activeRoom,
        targetUserId: fromUserId,
        payload: data,
      });
    };
    if (!pc) return;
    try {
      if (payload.type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'answer', sdp: answer.sdp ?? '' });
      } else if (payload.type === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
      } else if (payload.type === 'ice') {
        await pc.addIceCandidate({
          candidate: payload.candidate.candidate,
          sdpMid: payload.candidate.sdpMid ?? undefined,
          sdpMLineIndex: payload.candidate.sdpMLineIndex ?? undefined,
        });
      }
    } catch (error) {
      console.error('RTC signal error', error);
    }
  });

  socket.on('disconnect', () => {
    useVoiceStore
      .getState()
      .leave()
      .catch(() => undefined);
  });
}

function createPeerConnection(userId: string, initiator: boolean) {
  if (peerConnections.has(userId)) {
    return peerConnections.get(userId)!;
  }
  const socket = useRealtimeStore.getState().socket;
  const state = useVoiceStore.getState();
  if (!socket || !state.currentRoom || !state.localStream) return;
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });
  state.localStream.getTracks().forEach((track) => {
    pc.addTrack(track, state.localStream!);
  });
  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    useVoiceStore.setState((prev) => ({
      participants: {
        ...prev.participants,
        [userId]: {
          ...(prev.participants[userId] ?? { userId }),
          stream,
        },
      },
    }));
  };
  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    const room = useVoiceStore.getState().currentRoom;
    if (!room) return;
    socket.emit('rtc.signal', {
      ...room,
      targetUserId: userId,
      payload: {
        type: 'ice',
        candidate: {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? null,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
        },
      },
    });
  };
  peerConnections.set(userId, pc);
  if (initiator) {
    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const room = useVoiceStore.getState().currentRoom;
        if (!room) return;
        socket.emit('rtc.signal', {
          ...room,
          targetUserId: userId,
          payload: { type: 'offer', sdp: offer.sdp ?? '' },
        });
      } catch (error) {
        console.error('RTC offer error', error);
      }
    })();
  }
  return pc;
}
EOF
mkdir -p 'apps/web/src'
cat <<'EOF' > 'apps/web/src/vite-env.d.ts'
/// <reference types="vite/client" />

EOF
mkdir -p 'apps/web'
cat <<'EOF' > 'apps/web/tailwind.config.cjs'
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1f2333',
        sidebar: '#161a29',
        accent: '#5865f2',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

EOF
mkdir -p 'apps/web'
cat <<'EOF' > 'apps/web/tsconfig.json'
{
  "extends": "../../packages/config/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src", "vite.config.ts"],
  "references": []
}

EOF
mkdir -p 'apps/web'
cat <<'EOF' > 'apps/web/vite.config.ts'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/realtime': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});

EOF
mkdir -p 'apps/web'
cat <<'EOF' > 'apps/web/vitest.config.ts'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

EOF
mkdir -p 'collections'
cat <<'EOF' > 'collections/guildchat.http'
### Register
POST http://localhost:3001/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "displayName": "Example User"
}

### Login
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}

### Create server
POST http://localhost:3001/servers
Content-Type: application/json
Cookie: accessToken={{accessToken}}

{
  "name": "Test Server"
}

### List servers
GET http://localhost:3001/servers
Cookie: accessToken={{accessToken}}

### Create channel
POST http://localhost:3001/channels
Content-Type: application/json
Cookie: accessToken={{accessToken}}

{
  "serverId": "{{serverId}}",
  "name": "general"
}

### Send message
POST http://localhost:3001/channels/{{channelId}}/messages
Content-Type: application/json
Cookie: accessToken={{accessToken}}

{
  "content": "Hello world"
}

### Search messages
GET http://localhost:3001/search?scope=channel&id={{channelId}}&q=Hello
Cookie: accessToken={{accessToken}}

EOF
cat <<'EOF' > 'docker-compose.yml'
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: discord
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    env_file: .env
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/discord
      REDIS_URL: redis://redis:6379
    volumes:
      - ./apps/server/uploads:/app/apps/server/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - '3001:3001'

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    depends_on:
      - server
    ports:
      - '5173:5173'
    environment:
      VITE_API_URL: http://server:3001

volumes:
  postgres-data:

EOF
mkdir -p 'docs'
cat <<'EOF' > 'docs/er-diagram.md'
# ER Diagram Overview

```mermaid
erDiagram
  User ||--o{ Server : owns
  User ||--o{ ServerMember : joins
  Server ||--o{ ServerMember : contains
  Server ||--o{ Role : defines
  ServerMember ||--o{ MemberRole : has
  Role ||--o{ MemberRole : assigned
  Server ||--o{ Channel : hosts
  Channel ||--o{ Message : contains
  DMThread ||--o{ Message : holds
  User ||--o{ Message : authored
  Message ||--o{ Attachment : has
  Message ||--o{ Reaction : receives
  DMThread ||--o{ DMParticipant : includes
  User ||--o{ DMParticipant : participates
  Server ||--o{ Invite : exposes
  User ||--o{ Presence : tracks
```

EOF
cat <<'EOF' > 'eslint.config.js'
import config from './packages/config/eslint.config.js';

export default config;

EOF
cat <<'EOF' > 'package.json'
{
  "name": "super-duper-octo-waddle",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@8.15.0",
  "scripts": {
    "dev": "pnpm -r run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "test": "pnpm -r run test",
    "format": "pnpm -r run format",
    "migrate": "pnpm --filter server prisma migrate deploy",
    "seed": "pnpm --filter server prisma db seed"
  },
  "devDependencies": {
    "@types/node": "20.11.19",
    "typescript": "5.4.3"
  }
}

EOF
mkdir -p 'packages/config'
cat <<'EOF' > 'packages/config/eslint.config.js'
import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    ignores: ['dist', 'build', 'coverage'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  prettier
);

EOF
mkdir -p 'packages/config'
cat <<'EOF' > 'packages/config/prettier.config.cjs'
module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  printWidth: 100
};

EOF
mkdir -p 'packages/config/tsconfig'
cat <<'EOF' > 'packages/config/tsconfig/base.json'
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021"],
    "module": "ESNext",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "baseUrl": "."
  }
}

EOF
mkdir -p 'packages/shared'
cat <<'EOF' > 'packages/shared/package.json'
{
  "name": "@acme/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --dts",
    "dev": "tsup src/index.ts --watch --dts",
    "lint": "eslint 'src/**/*.ts'",
    "format": "prettier --write 'src/**/*.ts'",
    "test": "vitest"
  },
  "dependencies": {
    "zod": "3.23.8"
  },
  "devDependencies": {
    "tsup": "7.2.0",
    "vitest": "1.4.0",
    "eslint": "8.57.0",
    "prettier": "3.2.5",
    "typescript": "5.4.3",
    "@types/node": "20.11.19"
  }
}

EOF
mkdir -p 'packages/shared/src'
cat <<'EOF' > 'packages/shared/src/index.ts'
import { z } from 'zod';

export enum Permission {
  MANAGE_GUILD = 1 << 0,
  MANAGE_CHANNELS = 1 << 1,
  MANAGE_ROLES = 1 << 2,
  KICK_MEMBERS = 1 << 3,
  BAN_MEMBERS = 1 << 4,
  READ_MESSAGES = 1 << 5,
  SEND_MESSAGES = 1 << 6,
  ATTACH_FILES = 1 << 7,
  MANAGE_MESSAGES = 1 << 8,
}

export const DEFAULT_MEMBER_PERMISSIONS =
  Permission.READ_MESSAGES | Permission.SEND_MESSAGES | Permission.ATTACH_FILES;

export const OWNER_PERMISSIONS =
  Object.values(Permission).reduce<number>((acc, value) =>
    typeof value === 'number' ? acc | value : acc,
  0);

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(64),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const CreateServerSchema = z.object({
  name: z.string().min(2).max(100),
  iconUrl: z.string().url().optional(),
});

export const ChannelTypes = ['TEXT', 'VOICE'] as const;
export type ChannelType = (typeof ChannelTypes)[number];

export const CreateChannelSchema = z.object({
  serverId: z.string().uuid(),
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  isPrivate: z.boolean().optional(),
  type: z.enum(ChannelTypes).default('TEXT'),
});

export const MessageSchema = z.object({
  content: z.string().max(4000).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        mime: z.string(),
        size: z.number().max(10 * 1024 * 1024),
      }),
    )
    .default([]),
});

export const WebsocketEvents = {
  PRESENCE_UPDATE: 'presence.state',
  TYPING: 'typing',
  MESSAGE_CREATED: 'message.created',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',
  REACTION_UPDATED: 'reaction.updated',
  UNREAD_UPDATE: 'unread.update',
  RTC_PARTICIPANTS: 'rtc.participants',
  RTC_PARTICIPANT_JOINED: 'rtc.participant-joined',
  RTC_PARTICIPANT_LEFT: 'rtc.participant-left',
  RTC_SIGNAL: 'rtc.signal',
  RTC_MEDIA_UPDATED: 'rtc.media-updated',
} as const;

export type WebsocketEventName = (typeof WebsocketEvents)[keyof typeof WebsocketEvents];

export const PresenceStatus = ['online', 'idle', 'offline'] as const;
export type PresenceStatus = (typeof PresenceStatus)[number];

export const PresenceUpdateSchema = z.object({
  status: z.enum(PresenceStatus),
});

export const TypingEventSchema = z.object({
  channelId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
}).refine((data) => data.channelId || data.threadId, {
  message: 'channelId or threadId is required',
});

export const CreateMessageSchema = z
  .object({
    channelId: z.string().uuid().optional(),
    threadId: z.string().uuid().optional(),
    content: z.string().max(4000).optional(),
    attachments: z
      .array(
        z.object({
          url: z.string().url(),
          mime: z.string(),
          size: z.number().max(10 * 1024 * 1024),
        }),
      )
      .default([]),
  })
  .refine((data) => data.channelId || data.threadId, {
    message: 'channelId or threadId is required',
  });

export const EditMessageSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().max(4000),
});

export const DeleteMessageSchema = z.object({
  messageId: z.string().uuid(),
});

export const ReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(64),
});

const rtcRoomTarget = z
  .object({
    channelId: z.string().uuid().optional(),
    threadId: z.string().uuid().optional(),
  })
  .refine((data) => data.channelId || data.threadId, {
    message: 'channelId or threadId is required',
  });

export const RTCJoinSchema = rtcRoomTarget.extend({
  enableVideo: z.boolean().optional(),
});

export const RTCLeaveSchema = rtcRoomTarget;

const rtcOffer = z.object({
  type: z.literal('offer'),
  sdp: z.string(),
});

const rtcAnswer = z.object({
  type: z.literal('answer'),
  sdp: z.string(),
});

const rtcIceCandidate = z.object({
  type: z.literal('ice'),
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
  }),
});

export const RTCSignalSchema = rtcRoomTarget.extend({
  targetUserId: z.string().uuid(),
  payload: z.union([rtcOffer, rtcAnswer, rtcIceCandidate]),
});

export const RTCMediaUpdateSchema = rtcRoomTarget.extend({
  videoEnabled: z.boolean(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateServerInput = z.infer<typeof CreateServerSchema>;
export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export type MessageInput = z.infer<typeof MessageSchema>;
export type PresenceUpdateInput = z.infer<typeof PresenceUpdateSchema>;
export type TypingEventInput = z.infer<typeof TypingEventSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export type DeleteMessageInput = z.infer<typeof DeleteMessageSchema>;
export type ReactionInput = z.infer<typeof ReactionSchema>;
export type RTCJoinInput = z.infer<typeof RTCJoinSchema>;
export type RTCLeaveInput = z.infer<typeof RTCLeaveSchema>;
export type RTCSignalInput = z.infer<typeof RTCSignalSchema>;
export type RTCMediaUpdateInput = z.infer<typeof RTCMediaUpdateSchema>;

export const DMThreadCreateSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(10),
});

export type DMThreadCreateInput = z.infer<typeof DMThreadCreateSchema>;

export const InviteCreateSchema = z.object({
  maxUses: z.number().int().min(1).max(100).default(5),
  expiresAt: z.string().datetime().optional(),
});

export type InviteCreateInput = z.infer<typeof InviteCreateSchema>;

export const SearchSchema = z.object({
  scope: z.enum(['channel', 'server']),
  id: z.string().uuid(),
  q: z.string().min(1),
});

export const SlowModeSchema = z.object({
  channelId: z.string().uuid(),
  interval: z.number().int().min(0).max(21600),
});

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  before: z.string().uuid().optional(),
});

export const UploadPolicy = {
  maxSize: 10 * 1024 * 1024,
  allowedMime: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf'],
};

export const ReactionEmojis = ['👍', '❤️', '😂', '🎉', '👀', '😢'] as const;
EOF
mkdir -p 'packages/shared'
cat <<'EOF' > 'packages/shared/tsconfig.json'
{
  "extends": "../config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}

EOF
cat <<'EOF' > 'pnpm-workspace.yaml'
packages:
  - 'apps/*'
  - 'packages/*'

EOF
cat <<'EOF' > 'prettier.config.cjs'
module.exports = require('./packages/config/prettier.config.cjs');

EOF
