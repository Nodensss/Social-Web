import { prisma, ToyStatus, UserRole, type Toy } from "@toyverse/db";
import { ensureDefaultFamilyForUser } from "./auth";
import { notFound } from "./errors";

export async function findUserByTelegramId(telegramId: string | number) {
  return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
}

export type UpsertTelegramUserInput = {
  telegramId: string | number;
  displayName: string;
};

export async function upsertTelegramUser(input: UpsertTelegramUserInput) {
  const telegramId = String(input.telegramId);
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { displayName: input.displayName },
    create: {
      telegramId,
      displayName: input.displayName,
      role: UserRole.parent,
    },
  });
  await ensureDefaultFamilyForUser(user.id);
  return user;
}

export async function getToyByIdForUser(userId: string, toyId: string): Promise<Toy> {
  const familyId = await ensureDefaultFamilyForUser(userId);
  const toy = await prisma.toy.findFirst({
    where: { id: toyId, ownerChild: { familyId } },
  });
  if (!toy) throw notFound("Игрушка не найдена.");
  return toy;
}

export async function waitForToyReady(
  toyId: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<Toy | null> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 1500;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const toy = await prisma.toy.findUnique({ where: { id: toyId } });
    if (!toy) return null;
    if (toy.status === ToyStatus.ready || toy.status === ToyStatus.failed) return toy;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return prisma.toy.findUnique({ where: { id: toyId } });
}

export async function findOwnerTelegramIdForToy(toyId: string): Promise<string | null> {
  const toy = await prisma.toy.findUnique({
    where: { id: toyId },
    include: { ownerChild: { include: { family: { include: { owner: true } } } } },
  });
  return toy?.ownerChild.family.owner.telegramId ?? null;
}

/**
 * Возвращает Telegram-id владельца поста, кроме случая, когда инициатор
 * (другая игрушка) принадлежит тому же владельцу — чтобы не спамить себе же.
 */
export async function ownerToNotifyForPost(
  postId: string,
  actingToyId: string,
): Promise<string | null> {
  const ownerTg = await findOwnerTelegramIdForPost(postId);
  if (!ownerTg) return null;
  const actorTg = await findOwnerTelegramIdForToy(actingToyId);
  if (actorTg && actorTg === ownerTg) return null;
  return ownerTg;
}

export async function findOwnerTelegramIdForPost(postId: string): Promise<string | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorToyId: true },
  });
  if (!post) return null;
  return findOwnerTelegramIdForToy(post.authorToyId);
}

export async function deleteToyForUser(userId: string, toyId: string): Promise<void> {
  const familyId = await ensureDefaultFamilyForUser(userId);
  const toy = await prisma.toy.findFirst({
    where: { id: toyId, ownerChild: { familyId } },
    select: { id: true },
  });
  if (!toy) throw notFound("Игрушка не найдена.");
  await prisma.toy.delete({ where: { id: toyId } });
}

let notifier: ((telegramId: string, text: string) => Promise<void>) | null = null;

export function setNotifier(fn: (telegramId: string, text: string) => Promise<void>) {
  notifier = fn;
}

async function notifyViaBotApi(telegramId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: telegramId, text }),
    });
    if (!res.ok) {
      console.warn("[core] notifyTelegram bot api status", res.status);
    }
  } catch (e) {
    console.warn("[core] notifyTelegram fetch failed", e);
  }
}

export async function notifyTelegram(telegramId: string, text: string): Promise<void> {
  if (notifier) {
    await notifier(telegramId, text).catch((e) => {
      console.warn("[core] notifyTelegram failed", e);
    });
    return;
  }
  // Fallback для процессов без бота (web, worker): шлём напрямую через Bot API.
  await notifyViaBotApi(telegramId, text);
}
