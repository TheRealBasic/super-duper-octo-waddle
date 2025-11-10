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
