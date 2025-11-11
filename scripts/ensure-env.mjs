#!/usr/bin/env node
import { existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(currentDir, '..');
const envPath = join(rootDir, '.env');
const examplePath = join(rootDir, '.env.example');

if (!existsSync(examplePath)) {
  console.warn('No .env.example file found; skipping environment bootstrap.');
  process.exit(0);
}

if (existsSync(envPath)) {
  process.exit(0);
}

copyFileSync(examplePath, envPath);
console.log('Created .env file from .env.example for local development.');

