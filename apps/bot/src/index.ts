import { Bot, Context, session, SessionFlavor } from 'grammy';
import { prisma } from '@toyverse/db';
import { linkTelegramAccount, createToy, updateToy, getFamilyFeed } from '@toyverse/core';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' }); // Load from root in dev

interface SessionData {
  step: 'idle' | 'awaiting_rename';
  pendingToyId?: string;
}

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN || '');

function initial() {
  return { step: 'idle' } as SessionData;
}
bot.use(session({ initial }));

// Helper to check if user is linked
async function getUser(ctx: MyContext) {
  if (!ctx.from?.id) return null;
  return prisma.user.findUnique({
    where: { telegramId: String(ctx.from.id) },
    include: { family: { include: { children: true } } }
  });
}

bot.command('start', async (ctx) => {
  const code = ctx.match;
  if (!code) {
    return ctx.reply('Привет! Чтобы пользоваться ботом, привяжи его в веб-версии: Настройки -> Привязать Telegram. Там ты получишь код. Напиши: /start <код>');
  }

  try {
    const telegramId = String(ctx.from?.id);
    await linkTelegramAccount(code, telegramId);
    await ctx.reply('Готово! Твой аккаунт привязан к семье. Теперь ты можешь отправлять сюда фото игрушек, и я их оживлю! 🧸✨');
  } catch (error: any) {
    await ctx.reply('Ой, не удалось привязать аккаунт. Проверь код или попробуй снова.');
  }
});

bot.command('feed', async (ctx) => {
  const user = await getUser(ctx);
  if (!user?.familyId) {
    return ctx.reply('Сначала привяжи аккаунт с помощью команды /start <код>');
  }

  try {
    const posts = await getFamilyFeed(user.familyId, 5);
    if (posts.length === 0) {
      return ctx.reply('В вашей ленте пока нет постов. Оживите игрушку, чтобы она написала первый!');
    }

    let message = '🗞 **Последние новости из ToyVerse:**\n\n';
    posts.forEach(post => {
      const time = new Date(post.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      message += `🧸 **${post.authorToy.fullName}** (${time})\n`;
      message += `«${post.text}»\n`;
      message += `❤️ Лайков: ${post.reactions.length} | 💬 Комментариев: ${post.comments.length}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('Не удалось загрузить ленту.');
  }
});

bot.on('message:photo', async (ctx) => {
  const user = await getUser(ctx);
  if (!user?.familyId || user.family.children.length === 0) {
    return ctx.reply('Сначала привяжи аккаунт (/start <код>) и создай профиль ребёнка в веб-версии!');
  }

  const childId = user.family.children[0].id; // MVP: picks first child
  
  // Get the highest resolution photo
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const file = await ctx.api.getFile(photo.file_id);
  const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  const waitMsg = await ctx.reply('Магия началась! Обрабатываю фото и придумываю историю... ✨');

  try {
    const toy = await createToy({
      ownerChildId: childId,
      originalPhotoUrl: photoUrl,
      species: 'other', // For MVP, we assume "other" unless explicitly asked
    });

    ctx.session.pendingToyId = toy.id;

    // Send mock preview logic (In real app, we'd wait for Inngest or poll DB until status is READY)
    // Since Inngest runs async, the web worker would actually process it.
    // For MVP bot demo, we'll just say it's queued and show what we have.
    await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `Игрушка создана и обрабатывается! (ID: ${toy.id})\nЧто делаем дальше? 👇`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Опубликовать', callback_data: 'publish' }],
          [{ text: '✏️ Переименовать', callback_data: 'rename' }],
          [{ text: '❌ Отмена', callback_data: 'cancel' }]
        ]
      }
    });

  } catch (error) {
    await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, 'Произошла ошибка при создании игрушки.');
  }
});

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const toyId = ctx.session.pendingToyId;

  if (!toyId) return ctx.answerCallbackQuery({ text: 'Игрушка не найдена или сессия истекла.' });

  if (data === 'publish') {
    // Usually would update status or just confirm
    await ctx.editMessageText('Готово! Игрушка сохранена в семейную коллекцию. 🚀');
    ctx.session.step = 'idle';
    ctx.session.pendingToyId = undefined;
  } else if (data === 'rename') {
    ctx.session.step = 'awaiting_rename';
    await ctx.editMessageText('Хорошо! Напиши новое имя для игрушки прямо сюда 👇');
  } else if (data === 'cancel') {
    // Would delete toy from DB
    await ctx.editMessageText('Создание отменено. 🗑️');
    ctx.session.step = 'idle';
    ctx.session.pendingToyId = undefined;
  }
  
  await ctx.answerCallbackQuery();
});

bot.on('message:text', async (ctx) => {
  if (ctx.session.step === 'awaiting_rename' && ctx.session.pendingToyId) {
    const newName = ctx.message.text;
    try {
      await updateToy(ctx.session.pendingToyId, { fullName: newName });
      await ctx.reply(`Готово! Теперь игрушку зовут **${newName}**! 🎉`, { parse_mode: 'Markdown' });
    } catch (e) {
      await ctx.reply('Ошибка при переименовании.');
    } finally {
      ctx.session.step = 'idle';
      ctx.session.pendingToyId = undefined;
    }
  }
});

bot.catch((err) => {
  console.error(`Error in bot:`, err);
});

export function startBot() {
  console.log('Starting Telegram bot...');
  bot.start();
}

if (require.main === module) {
  startBot();
}
