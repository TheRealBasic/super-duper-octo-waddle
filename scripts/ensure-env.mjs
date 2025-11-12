#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function ensureDirectoryExists(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyIfDifferent(source, target) {
  if (!existsSync(source)) {
    return false;
  }

  ensureDirectoryExists(target);

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

function ensureKeyWithFallback(targetPath, examplePath, key) {
  if (!existsSync(targetPath)) {
    return false;
  }

  const targetContent = readFileSync(targetPath, 'utf8');
  const keyRegex = new RegExp(`^${key}=([^\\r\\n]*)`, 'm');
  const match = targetContent.match(keyRegex);

  if (match && match[1].trim() !== '') {
    return false;
  }

  if (!existsSync(examplePath)) {
    console.warn(
      `Warning: ${key} is missing from ${targetPath} and no fallback was found at ${examplePath}.`,
    );
    return false;
  }

  const exampleContent = readFileSync(examplePath, 'utf8');
  const exampleMatch = exampleContent.match(keyRegex);

  if (!exampleMatch) {
    console.warn(`Warning: ${key} not found in ${examplePath}.`);
    return false;
  }

  const value = exampleMatch[1];
  const newContent =
    targetContent.trimEnd() + (targetContent.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
  writeFileSync(targetPath, newContent, 'utf8');
  return true;
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
const serverEnvUpdated = ensureKeyWithFallback(serverEnvPath, examplePath, 'DATABASE_URL');

if (syncedServerEnv) {
  console.log('Copied .env to apps/server/.env so Prisma CLI picks up DATABASE_URL.');
} else if (serverEnvUpdated) {
  console.log('Ensured DATABASE_URL exists in apps/server/.env for Prisma CLI.');
} else if (!createdRootEnv) {
  console.log('Environment files already up to date.');
}

process.exit(0);
