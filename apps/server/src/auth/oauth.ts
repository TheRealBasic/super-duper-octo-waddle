import jwt from 'jsonwebtoken';

interface BaseIdTokenPayload {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  picture?: unknown;
  exp?: unknown;
}

export interface OAuthProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

function decodeIdToken(token: string): BaseIdTokenPayload {
  const payload = jwt.decode(token, { json: true });
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid token payload');
  }
  return payload as BaseIdTokenPayload;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function toNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function assertNotExpired(payload: BaseIdTokenPayload) {
  const exp = toNumericValue(payload.exp);
  if (typeof exp === 'number' && exp * 1000 < Date.now()) {
    throw new Error('Token expired');
  }
}

function ensureAudience(expected: string | undefined, actual: unknown) {
  if (!expected) return;
  if (Array.isArray(actual)) {
    if (!actual.includes(expected)) {
      throw new Error('Invalid token audience');
    }
    return;
  }
  if (toStringValue(actual) !== expected) {
    throw new Error('Invalid token audience');
  }
}

export function verifyGoogleIdToken(
  token: string,
  options: { clientId?: string },
): OAuthProfile {
  const payload = decodeIdToken(token);
  const issuer = toStringValue(payload.iss);
  if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
    throw new Error('Invalid token issuer');
  }

  ensureAudience(options.clientId, payload.aud);
  assertNotExpired(payload);

  const subject = toStringValue(payload.sub);
  if (!subject) {
    throw new Error('Token missing subject');
  }

  const email = toStringValue(payload.email);
  if (!email) {
    throw new Error('Token missing email');
  }

  const emailVerified = toBooleanValue(payload.email_verified);
  if (emailVerified !== true) {
    throw new Error('Unverified email');
  }

  const givenName = toStringValue(payload.given_name);
  const familyName = toStringValue(payload.family_name);
  const fullName = toStringValue(payload.name) ?? [givenName, familyName].filter(Boolean).join(' ').trim();
  const avatarUrl = toStringValue(payload.picture);

  return {
    id: subject,
    email,
    emailVerified: true,
    name: fullName || undefined,
    avatarUrl,
  };
}

export function verifyAppleIdToken(
  token: string,
  options: { clientId?: string },
): OAuthProfile {
  const payload = decodeIdToken(token);
  const issuer = toStringValue(payload.iss);
  if (issuer !== 'https://appleid.apple.com') {
    throw new Error('Invalid token issuer');
  }

  ensureAudience(options.clientId, payload.aud);
  assertNotExpired(payload);

  const subject = toStringValue(payload.sub);
  if (!subject) {
    throw new Error('Token missing subject');
  }

  const email = toStringValue(payload.email);
  if (!email) {
    throw new Error('Token missing email');
  }

  const emailVerified = toBooleanValue(payload.email_verified);
  if (emailVerified !== true) {
    throw new Error('Unverified email');
  }

  const givenName = toStringValue(payload.given_name);
  const familyName = toStringValue(payload.family_name);
  const fullName = toStringValue(payload.name) ?? [givenName, familyName].filter(Boolean).join(' ').trim();

  return {
    id: subject,
    email,
    emailVerified: true,
    name: fullName || undefined,
  };
}
