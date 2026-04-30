import "dotenv/config";
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.warn("[bot] TELEGRAM_BOT_TOKEN не задан, бот не стартует.");
  process.exit(0);
}

const bot = new Bot(token);

bot.command("start", (ctx) =>
  ctx.reply(
    "Привет! Я ToyVerse-бот. Пришли фото игрушки — я создам ей профиль.\n" +
      "Команды: /feed — последние посты семьи.",
  ),
);

bot.command("feed", (ctx) =>
  ctx.reply("Лента появится после этапа 4 ТЗ. Скоро!"),
);

bot.on("message:photo", (ctx) =>
  ctx.reply(
    "Принял фото 📸. Обработка появится на этапе 2: я загружу его, поставлю задачу " +
      "в очередь и пришлю карточку героя.",
  ),
);

bot.start({ onStart: (me) => console.log(`[bot] @${me.username} запущен`) });
