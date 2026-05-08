# ToyVerse

Private social network for toys. 

## Project Architecture
- **Web App**: Next.js 15 (App Router)
- **Bot**: grammY Telegram bot (soon)
- **Database**: PostgreSQL (Neon/Supabase) via Prisma
- **Storage**: Cloudflare R2
- **Jobs**: Inngest (planned)

## Quick Start (10 minutes)

### 1. Requirements
- Node.js 20+
- pnpm 9+
- PostgreSQL database (e.g., free tier on Neon.tech)

### 2. Setup
1. Clone the repository.
2. Run `pnpm install` at the root.
3. Copy `.env.example` to `.env` and fill in your values. At a minimum, set `DATABASE_URL` and `AUTH_SECRET` (generate one with `npx auth secret`).
4. Generate Prisma Client and apply migrations:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

### 3. Running Locally
Start the development server (runs all workspace apps):
```bash
pnpm dev
```
Access the web app at `http://localhost:3000`.

## Workspace Structure
- `apps/web` - Main Next.js frontend and API.
- `apps/bot` - Telegram bot.
- `packages/db` - Prisma schema, migrations, and generated client.
- `packages/core` - Pure business logic functions.
- `packages/ai` - AI adapters with mock fallbacks for local dev without keys.
- `packages/ui` - Shared React components.

## Development
To mock AI responses locally, simply leave the API keys (e.g., `ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`) empty in your `.env`. The `packages/ai` adapters will automatically fallback to mocked responses.
