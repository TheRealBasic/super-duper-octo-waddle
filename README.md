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
- WebRTC-powered voice and video calls for server voice channels and DM threads, signaled through Socket.IO.
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

## Windows Quickstart Guide

The project is developed with cross-platform tooling. On Windows we recommend using the latest Windows 11 release with WSL2
integration so Docker and the Node.js toolchain behave consistently. The walkthrough below uses PowerShell and Ubuntu (WSL2),
but the same steps work in Windows Terminal.

### 1. Install required software

1. **Enable WSL2 (recommended)**
   - Open PowerShell as Administrator and run: `wsl --install`.
   - Reboot when prompted and complete the Ubuntu installation from the Microsoft Store.
2. **Install Git** – Download the Windows installer from <https://git-scm.com/downloads> and choose the "Git from the command
   line" option so Git is available in PowerShell.
3. **Install Node.js + pnpm**
   - Install Node.js 18 LTS from <https://nodejs.org/en/download> (the installer also enables `corepack`).
   - After installation, open a new PowerShell window and run `corepack enable` followed by `corepack prepare pnpm@8 --activate`.
4. **Install Docker Desktop** – Download from <https://www.docker.com/products/docker-desktop/>. During setup, enable the
   "Use WSL 2 based engine" option. After installation, launch Docker Desktop once so it finishes configuring the backend.

### 2. Clone the repository

```powershell
git clone https://github.com/your-org/guildchat.git
cd guildchat
```

If you prefer to work entirely inside WSL, open Ubuntu (WSL) and run the same commands inside your Linux home directory. Docker
Desktop automatically shares files between Windows and WSL.

### 3. Bootstrap the project

Run the bootstrap script to create any generated files tracked by the repository:

```powershell
./bootstrap.sh
```

> **Tip:** When running inside PowerShell, the first execution may prompt for permission to run scripts. If you see a policy
> warning, execute `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` and rerun the script.

### 4. Configure environment variables

Create the `.env` file by copying the template:

```powershell
cp .env.example .env
```

If you skip this step, the workspace `pnpm -w run migrate` and `pnpm -w run seed` commands will automatically copy `.env.example`
for you before Prisma runs. Either way, make sure to review and update any secrets (JWT keys, SMTP settings, etc.) before
running in production.

### 5. Install dependencies

Install all workspace packages with pnpm:

```powershell
pnpm install
```

If PowerShell cannot find `pnpm`, confirm that `C:\Program Files\nodejs` is in your `Path` or re-run `corepack prepare pnpm@8 --activate`.

### 6. Prepare the database

Apply Prisma migrations and seed the development data set:

```powershell
pnpm -w run migrate
pnpm -w run seed
```

Docker Compose automatically brings up PostgreSQL when you start the stack (next step), but the CLI commands ensure the schema
exists and that sample servers/messages are available.

### 7. Launch the application

Start every service (API, web client, PostgreSQL, Redis, object storage stub) with a single command:

```powershell
pnpm -w run dev
```

The first run pulls Docker images, so expect a short delay. Once the log output stabilizes:

- API: <http://localhost:3001>
- Web client: <http://localhost:5173>

Open a browser to the web client URL and sign in with one of the seeded accounts (e.g., `user1@example.com` / `password123`).

### 8. Running tests on Windows

To execute the Vitest suites locally:

```powershell
pnpm -w run test
```

Vitest uses jsdom and runs entirely in Node, so no additional setup is required.

### 9. Stopping services and cleaning up

- Press `Ctrl + C` in the terminal running `pnpm -w run dev` to stop the stack.
- To tear down containers and volumes manually, run `docker compose down --volumes`.
- If you need to reset the database, rerun the migrate/seed commands after the stack is up.

With these steps complete, you can iterate on the frontend (Vite hot module reload) and backend (Fastify with hot reload) from
the same Windows workstation.

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
- Voice/video media streams use browser WebRTC APIs with peer-to-peer mesh; Redis-backed signaling keeps participants in sync.

Enjoy exploring GuildChat!
