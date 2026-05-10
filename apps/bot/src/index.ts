import "dotenv/config";
import { Bot, InlineKeyboard, type Context } from "grammy";
import {
  createToy,
  deleteToyForUser,
  findUserByTelegramId,
  getToyByIdForUser,
  listFeedForUser,
  publishToyToFeed,
  updateToyForUser,
  upsertTelegramUser,
  waitForToyReady,
} from "@toyverse/core";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.warn("[bot] TELEGRAM_BOT_TOKEN не задан, бот не стартует.");
  process.exit(0);
}

const bot = new Bot(token);

// Простое in-memory состояние «жду новое имя для toy X».
const renameWaiters = new Map<number, string>();

async function ensureUser(ctx: Context): Promise<string | null> {
  if (!ctx.from) return null;
  const displayName =
    [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ").trim() ||
    ctx.from.username ||
    `Telegram ${ctx.from.id}`;
  const user = await upsertTelegramUser({
    telegramId: ctx.from.id,
    displayName,
  });
  return user.id;
}

bot.command("start", async (ctx) => {
  await ensureUser(ctx);
  await ctx.reply(
    "Привет! Я ToyVerse-бот.\n" +
      "Пришли фото игрушки — я создам ей профиль героя.\n" +
      "/feed — последние посты вашей семьи.",
  );
});

bot.command("feed", async (ctx) => {
  const userId = await ensureUser(ctx);
  if (!userId) return;
  const page = await listFeedForUser(userId, { limit: 5 });
  if (page.items.length === 0) {
    await ctx.reply("В ленте пока пусто. Загрузи фото игрушки!");
    return;
  }
  for (const post of page.items) {
    const text = `🧸 ${post.authorToy.fullName}\n\n${post.text}`;
    const photo = post.mediaUrls[0] ?? post.authorToy.processedImageUrl ?? post.authorToy.originalPhotoUrl;
    if (photo) {
      await ctx.replyWithPhoto(photo, { caption: text });
    } else {
      await ctx.reply(text);
    }
  }
});

bot.on("message:photo", async (ctx) => {
  const userId = await ensureUser(ctx);
  if (!userId) return;

  const photos = ctx.message.photo;
  const largest = photos[photos.length - 1];
  if (!largest) return;

  await ctx.reply("Принял фото 📸 Обрабатываю…");

  let bytes: Buffer;
  try {
    const file = await ctx.api.getFile(largest.file_id);
    if (!file.file_path) throw new Error("Telegram не вернул путь к файлу.");
    const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`download ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    await ctx.reply("Не удалось скачать фото из Telegram. Попробуй ещё раз.");
    console.error("[bot] photo download failed", error);
    return;
  }

  const speciesHint = ctx.message.caption?.trim() || undefined;

  let toyId: string;
  try {
    const result = await createToy({
      userId,
      file: { bytes, contentType: "image/jpeg", originalName: `tg-${largest.file_id}.jpg` },
      speciesHint,
    });
    toyId = result.toy.id;
  } catch (error) {
    await ctx.reply("Не получилось завести игрушку. Попробуй ещё раз позже.");
    console.error("[bot] createToy failed", error);
    return;
  }

  const ready = await waitForToyReady(toyId, { timeoutMs: 90_000, intervalMs: 2000 });
  if (!ready) {
    await ctx.reply("Игрушка ещё не собралась. Загляни в веб-приложение чуть позже.");
    return;
  }
  if (ready.status === "failed") {
    await ctx.reply("Что-то пошло не так с обработкой. Попробуй другое фото.");
    return;
  }

  const caption =
    `🧸 ${ready.fullName}\n` +
    (ready.bio ? `\n${ready.bio}\n` : "") +
    (ready.personalityTraits.length ? `\nХарактер: ${ready.personalityTraits.join(", ")}` : "") +
    (ready.catchphrases.length ? `\nЛюбимые фразы: ${ready.catchphrases.join(" · ")}` : "");

  const keyboard = new InlineKeyboard()
    .text("✅ Опубликовать", `publish:${toyId}`)
    .text("✏️ Переименовать", `rename:${toyId}`)
    .row()
    .text("❌ Отменить", `cancel:${toyId}`);

  const photoUrl = ready.processedImageUrl ?? ready.originalPhotoUrl;
  await ctx.replyWithPhoto(photoUrl, { caption, reply_markup: keyboard });
});

bot.callbackQuery(/^publish:(.+)$/, async (ctx) => {
  const userId = await ensureUser(ctx);
  if (!userId) return;
  const toyId = ctx.match[1]!;
  try {
    await publishToyToFeed(userId, toyId);
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.answerCallbackQuery("Опубликовано в семейной ленте!");
  } catch (error) {
    await ctx.answerCallbackQuery({ text: errorMessage(error), show_alert: true });
  }
});

bot.callbackQuery(/^rename:(.+)$/, async (ctx) => {
  const userId = await ensureUser(ctx);
  if (!userId) return;
  const toyId = ctx.match[1]!;
  try {
    await getToyByIdForUser(userId, toyId);
  } catch (error) {
    await ctx.answerCallbackQuery({ text: errorMessage(error), show_alert: true });
    return;
  }
  if (ctx.from) renameWaiters.set(ctx.from.id, toyId);
  await ctx.answerCallbackQuery();
  await ctx.reply("Пришли новое имя одним сообщением. Напиши «отмена», чтобы выйти.");
});

bot.callbackQuery(/^cancel:(.+)$/, async (ctx) => {
  const userId = await ensureUser(ctx);
  if (!userId) return;
  const toyId = ctx.match[1]!;
  try {
    await deleteToyForUser(userId, toyId);
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.answerCallbackQuery("Отменено и удалено.");
  } catch (error) {
    await ctx.answerCallbackQuery({ text: errorMessage(error), show_alert: true });
  }
});

bot.on("message:text", async (ctx, next) => {
  if (!ctx.from) return next();
  const toyId = renameWaiters.get(ctx.from.id);
  if (!toyId) return next();
  const text = ctx.message.text.trim();
  if (text.toLowerCase() === "отмена") {
    renameWaiters.delete(ctx.from.id);
    await ctx.reply("Хорошо, оставляю как есть.");
    return;
  }
  const userId = await ensureUser(ctx);
  if (!userId) return;
  try {
    const updated = await updateToyForUser(userId, toyId, { fullName: text });
    renameWaiters.delete(ctx.from.id);
    await ctx.reply(`Готово: теперь её зовут «${updated.fullName}».`);
  } catch (error) {
    await ctx.reply(`Не получилось переименовать: ${errorMessage(error)}`);
  }
});

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Что-то пошло не так.";
}

bot.start({ onStart: (me) => console.log(`[bot] @${me.username} запущен`) });

// Экспорт для будущих уведомлений из core (lazy-inject через setNotifier).
export async function notifyTelegramUser(telegramId: string, text: string) {
  await bot.api.sendMessage(telegramId, text).catch((e) => {
    console.warn("[bot] notify failed", e);
  });
}

// Используется только для type-check — заглушка против неиспользования импорта.
export const _notifierProbe = findUserByTelegramId;
