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
