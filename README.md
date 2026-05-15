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

## Самый простой запуск (Windows)

Нужны установленные **Docker Desktop** (запущен) и **Node.js 20+**.
Дважды кликните `start.bat` (или запустите его в терминале). Скрипт сам
поднимет базу, поставит зависимости, применит схему и запустит сервер,
а в конце покажет адрес для телефона вида `http://192.168.x.x:3000`.
Телефон должен быть в той же Wi-Fi-сети. Чтобы выключить — закройте окно.

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

## Этап 2: вход и пайплайн игрушки

- Magic-link: `POST /api/auth/magic-link` создаёт сессию и отправляет письмо через Resend. Без `RESEND_API_KEY` ссылка пишется в лог и возвращается в dev-ответе.
- Telegram OAuth: `/api/auth/telegram` проверяет подпись Telegram Login Widget и кладёт cookie `toyverse_session`.
- Upload: `POST /api/toys` принимает `multipart/form-data` с полем `photo`, загружает файл в S3. Если S3 не настроен, используется локальная папка `LOCAL_UPLOAD_DIR`.
- Очередь: для игрушки создаются `ProcessingJob` и BullMQ jobs `image_stylize`, `bio_generate`, а при `FEATURE_3D_ENABLED=true` ещё `model_3d`.
- Worker: `workers/jobs` вызывает общий use-case `processToyJob` из `packages/core`.
- AI: `packages/ai` содержит mock, Anthropic, OpenAI и Replicate-адаптеры. JSON био валидируется через `ToyBioSchema`, текстовый AI-вывод проходит `moderateText` перед сохранением.

## Этап 3: лента и взаимодействия

- `GET /api/feed?cursor=...` — посты семьи, курсорная пагинация по `id`.
- `POST /api/toys/:id/posts` — создаёт пост от лица игрушки. Поля: `text` или `generateWithAi: true` + `topic` (`daily|story|question`). AI-сочинение использует bio/traits/catchphrases героя.
- `POST /api/posts/:id/reactions` — toggle-лайк от лица выбранной игрушки (`asToyId`, `type=heart|star|laugh`).
- `POST /api/posts/:id/comments` / `GET` — комментарий от лица игрушки. Текст обязательно проходит `moderateText`.
- UI: главная `/` — лента карточек с реакциями и веткой комментариев; на `/toys/:id` — блок «Написать пост от лица героя» (ручной/AI-режим).

## Этап 4: Telegram-бот

- `/start` — заводит/находит пользователя по `telegramId`, создаёт семью.
- Фото в чат → `createToy` (тот же use-case, что и в вебе) → ожидание готовности через `waitForToyReady` → карточка героя с inline-кнопками **Опубликовать / Переименовать / Отменить**.
- Подпись к фото используется как `speciesHint` для AI.
- Переименование: бот ждёт следующее текстовое сообщение и вызывает `updateToyForUser`.
- `/feed` — последние 5 постов семьи в виде сообщений с фото.
- Без `TELEGRAM_BOT_TOKEN` бот не стартует, а остальные сервисы продолжают работать.

## Этап 5: дружба и приватность

- `POST /api/friendships` — заявка/подтверждение дружбы между двумя игрушками своей семьи (для MVP принимается сразу). `POST /api/friendships/:id/accept` — отдельное подтверждение.
- `GET /api/family/export` — JSON со всеми данными семьи (игрушки, посты, реакции, комментарии, дружба, ссылки на медиа). `Content-Disposition: attachment`.
- `DELETE /api/family` — каскадное удаление всех данных семьи (§8 GDPR / 152-ФЗ). Аккаунт пользователя сохраняется.
- UI: блок «Друзья» на `/toys/:id`, страница `/family` с экспортом и красной зоной удаления.

## Статус каркаса

- [x] Этап 1 — монорепо, схема БД, заглушки страниц, mock-AI, бот, очередь.
- [x] Этап 2 — загрузка фото, S3/local upload, ProcessingJob end-to-end, Anthropic/OpenAI/Replicate-адаптеры, карточка игрушки.
- [x] Этап 3 — лента семьи, посты от лица игрушек (ручные и AI), реакции и комментарии с детской модерацией.
- [x] Этап 4 — Telegram-бот: загрузка фото в общий пайплайн, inline-карточка героя, /feed.
- [x] Этап 5 — friendship внутри семьи, экспорт и удаление данных семьи.

## Что осталось за рамками MVP

- Prisma migrations (`packages/db/prisma/migrations/`) ещё не зафиксированы — генерируются локально при первом `pnpm db:migrate`.
- Подписчики семьи через `FamilyInvite` (бабушки/дедушки) — модель есть, UI/API нет.
- 3D-провайдеры `meshy`/`tripo` — пока mock-заглушки.
- Уведомления о лайках/комментариях из веба в Telegram — есть `notifyTelegramUser`, нужно подключить хук в `posts/reactions/comments`.
- Экспорт делает JSON; полноценный zip с медиа можно сделать через `archiver`.
