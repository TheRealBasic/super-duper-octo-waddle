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
