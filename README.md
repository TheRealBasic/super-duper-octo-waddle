# GuildChat Monorepo

GuildChat is a Discord-style collaboration platform implemented as a TypeScript monorepo. The stack includes a Fastify + Prisma backend, a Vite + React frontend, shared type packages, Dockerized infrastructure, and real-time Socket.IO messaging backed by Redis.

## Features

- Email/password authentication with bcrypt hashing and JWT access/refresh rotation (httpOnly cookies).
- Server (guild) management with invite links, role-based permissions, and channel creation.
- Direct messages (1:1 and group), presence state, typing indicators, and message reactions.
- File uploads with thumbnailing, message editing/deleting, and moderation endpoints (kick/ban).
- Full-text search over messages leveraging PostgreSQL trigram indices.
- Real-time messaging via Socket.IO using Redis pub/sub adapter for horizontal scaling.
- Tailwind-powered React interface with Zustand state management.
- Comprehensive Docker Compose environment (PostgreSQL, Redis, MinIO-compatible storage stub, backend, frontend).

## Monorepo Structure

```
apps/
  server/          Fastify API + Prisma schema + Socket.IO gateway
  web/             React client (Vite, Tailwind, Zustand)
packages/
  config/          Shared ESLint, Prettier, and tsconfig presets
  shared/          Shared Zod schemas, permission constants, event names
collections/       REST client collections (HTTP file)
docs/              Architecture notes, ER diagram
scripts/           Utility scripts
```

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) 8+
- Docker & Docker Compose

### Bootstrap the repository

```bash
./bootstrap.sh
```

The bootstrap script recreates the full project structure with all files listed below.

### Environment Variables

Copy the template and adjust as needed:

```bash
cp .env.example .env
```

The backend expects matching variables at runtime (Docker compose wires them automatically).

### Install dependencies

```bash
pnpm install
```

### Database setup

```bash
pnpm -w run migrate
pnpm -w run seed
```

### Development servers

Start the entire stack (backend, frontend, Postgres, Redis, storage stub) with one command:

```bash
pnpm -w run dev
```

- API available at http://localhost:3001
- Web app available at http://localhost:5173

### Tests

```bash
pnpm -w run test
```

### Build for production

```bash
pnpm -w run build
```

## Docker Compose

`docker-compose.yml` provisions:

- `postgres`: PostgreSQL 15 with pg_trgm extension
- `redis`: Redis 7 for pub/sub and rate limiting
- `server`: Fastify application (hot reload in dev)
- `web`: Vite dev server or production build (depending on command)

Use `docker compose up --build` for a full containerized environment.

## API Documentation

- `collections/guildchat.http` contains ready-to-run REST examples for Insomnia/VS Code REST client.
- API follows REST endpoints described in the project brief (`/auth/*`, `/servers`, `/channels`, `/dms`, `/search`, `/moderation`, `/uploads`).

## ER Diagram

Refer to `docs/er-diagram.png` for the relational model. Key tables include `User`, `Server`, `ServerMember`, `Role`, `Channel`, `Message`, `Reaction`, `Invite`, and `Presence`.

## Scripts

- `pnpm -w run dev` – run backend + frontend concurrently.
- `pnpm -w run migrate` – apply Prisma migrations.
- `pnpm -w run seed` – populate development data (20 users, 3 servers, 200 messages per channel).
- `pnpm -w run test` – run Vitest suites.

## Additional Notes

- Presence and typing events are handled via Socket.IO; Redis ensures messages fan out across instances.
- Message uploads are stored on the filesystem (`apps/server/uploads`) with image thumbnailing via `sharp`.
- Rate limiting uses Fastify's rate-limit plugin tied into Redis token buckets.
- The seed script provides enough sample data to exercise search, reactions, and moderation flows.

Enjoy exploring GuildChat!
