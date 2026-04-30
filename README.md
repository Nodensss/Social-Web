# ToyVerse

Семейная соцсеть, где главные герои — игрушки. См. `TZ_ToyVerse.docx` (источник истины).

## Структура

```
apps/web      # Next.js 15 (App Router, Tailwind)
apps/bot      # Telegram-бот (grammY)
packages/db   # Prisma schema + клиент
packages/ai   # адаптеры LLM / image / 3D с фолбэком на mock
packages/core # бизнес-логика (use-cases)
packages/ui   # общие React-компоненты
workers/jobs  # BullMQ воркеры (стилизация, 3D, генерация био)
```

## Старт за 10 минут

Требуется: Node 20+, pnpm 9+, Docker (для Postgres + Redis).

```bash
cp .env.example .env
docker run -d --name toyverse-pg -e POSTGRES_USER=toyverse \
  -e POSTGRES_PASSWORD=toyverse -e POSTGRES_DB=toyverse \
  -p 5432:5432 postgres:16
docker run -d --name toyverse-redis -p 6379:6379 redis:7

pnpm install
pnpm db:generate && pnpm db:migrate
pnpm dev          # параллельно поднимает web + bot + jobs
```

Web: http://localhost:3000 · Health: http://localhost:3000/api/health

## AI-провайдеры

Все провайдеры выбираются через `.env` (`LLM_PROVIDER`, `IMAGE_PROVIDER`, `THREE_D_PROVIDER`).
По умолчанию — `mock`, чтобы UI работал без ключей. Системные промпты — на русском,
правила child-safety см. `packages/ai/src/prompts.ts` и ТЗ §8.

## Статус каркаса

- [x] Этап 1 — монорепо, схема БД, заглушки страниц, mock-AI, бот, очередь.
- [ ] Этап 2 — загрузка фото, S3, ProcessingJob end-to-end, реальные провайдеры.
- [ ] Этап 3 — лента, посты, лайки, комментарии от лица игрушек.
- [ ] Этап 4 — Telegram-бот: загрузка фото и уведомления.
- [ ] Этап 5 — friendship, AI-история знакомства, экспорт данных.

> Дальше продолжает Codex по разделам ТЗ.
