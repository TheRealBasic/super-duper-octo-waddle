import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import {
  DEFAULT_MEMBER_PERMISSIONS,
  OWNER_PERMISSIONS,
  ReactionEmojis,
  createDefaultNotificationSettings,
} from '@acme/shared';
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
          notificationSettings: createDefaultNotificationSettings(),
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
