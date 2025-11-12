import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const optionalEnvString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),
  COOKIE_DOMAIN: optionalEnvString,
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => (value.trim().length > 0 ? value.trim() : 'http://localhost:5173')),
  UPLOAD_DIR: z.string().default('apps/server/uploads'),
  MINIO_ENDPOINT: optionalEnvString,
  MINIO_BUCKET: optionalEnvString,
  MINIO_ACCESS_KEY: optionalEnvString,
  MINIO_SECRET_KEY: optionalEnvString,
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  GOOGLE_CLIENT_ID: optionalEnvString,
  APPLE_CLIENT_ID: optionalEnvString,
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
