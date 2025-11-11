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

export const OAuthProviders = ['GOOGLE', 'APPLE'] as const;
export type OAuthProvider = (typeof OAuthProviders)[number];

export const OAuthRegisterSchema = z.object({
  provider: z.enum(OAuthProviders),
  idToken: z.string().min(1),
});

export const NotificationSettingsSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  digest: z.boolean().default(false),
});

export const OnboardingPreferenceSchema = z.object({
  role: z.string().min(2).max(100),
  interests: z.array(z.string().min(1).max(32)).min(1).max(5),
  summaryFrequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  notifications: NotificationSettingsSchema,
});

export const WorkspaceRoles = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type WorkspaceRole = (typeof WorkspaceRoles)[number];

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
});

export const WorkspaceMemberInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(WorkspaceRoles).default('MEMBER'),
});

export const IntegrationProviders = ['SLACK', 'GOOGLE_DRIVE'] as const;
export type IntegrationProvider = (typeof IntegrationProviders)[number];

export const IntegrationCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(IntegrationProviders),
  accessToken: z.string().min(1).optional(),
  settings: z.record(z.any()).optional(),
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
export type OnboardingPreferencesInput = z.infer<typeof OnboardingPreferenceSchema>;
export type NotificationSettingsInput = z.infer<typeof NotificationSettingsSchema>;

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

export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateSchema>;
export type WorkspaceMemberInviteInput = z.infer<typeof WorkspaceMemberInviteSchema>;
export type IntegrationCreateInput = z.infer<typeof IntegrationCreateSchema>;
