#!/usr/bin/env node
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function copyIfDifferent(source, target) {
  if (!existsSync(source)) {
    return false;
  }
  if (!existsSync(target)) {
    copyFileSync(source, target);
    return true;
  }
  const sourceContent = readFileSync(source, 'utf8');
  const targetContent = readFileSync(target, 'utf8');
  if (sourceContent !== targetContent) {
    copyFileSync(source, target);
    return true;
  }
  return false;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(currentDir, '..');
const envPath = join(rootDir, '.env');
const examplePath = join(rootDir, '.env.example');
const serverEnvPath = join(rootDir, 'apps', 'server', '.env');

if (!existsSync(examplePath)) {
  console.warn('No .env.example file found; skipping environment bootstrap.');
  process.exit(0);
}

let createdRootEnv = false;
if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  createdRootEnv = true;
  console.log('Created .env file from .env.example for local development.');
}

const syncedServerEnv = copyIfDifferent(envPath, serverEnvPath);
if (syncedServerEnv) {
  console.log('Copied .env to apps/server/.env so Prisma CLI picks up DATABASE_URL.');
} else if (!createdRootEnv) {
  console.log('Environment files already up to date.');
}

process.exit(0);
if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log('Created .env file from .env.example for local development.');
}

if (!existsSync(serverEnvPath)) {
  copyFileSync(envPath, serverEnvPath);
  console.log('Copied .env to apps/server/.env so Prisma CLI picks up DATABASE_URL.');
}

process.exit(0);


