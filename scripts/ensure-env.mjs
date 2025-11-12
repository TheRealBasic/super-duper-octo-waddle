#!/usr/bin/env node
import { existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(currentDir, '..');
const envPath = join(rootDir, '.env');
const examplePath = join(rootDir, '.env.example');
const serverEnvPath = join(rootDir, 'apps', 'server', '.env');

if (!existsSync(examplePath)) {
  console.warn('No .env.example file found; skipping environment bootstrap.');
  process.exit(0);
}

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log('Created .env file from .env.example for local development.');
}

if (!existsSync(serverEnvPath)) {
  copyFileSync(envPath, serverEnvPath);
  console.log('Copied .env to apps/server/.env so Prisma CLI picks up DATABASE_URL.');
}

process.exit(0);


