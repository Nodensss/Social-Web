import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma, UserRole } from "@toyverse/db";
import { z } from "zod";
import { badRequest, forbidden, unauthorized } from "./errors";

export const SESSION_COOKIE = "toyverse_session";

const EmailSchema = z
  .string()
  .email()
  .max(320)
  .transform((email) => email.toLowerCase());

const TelegramAuthSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    photo_url: z.string().optional(),
    auth_date: z.union([z.string(), z.number()]),
    hash: z.string(),
  })
  .passthrough();

export type AuthUser = {
  id: string;
  email: string | null;
  telegramId: string | null;
  displayName: string;
  familyId: string | null;
};

export type SessionUser = {
  sessionId: string;
  user: AuthUser;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "Родитель";
  return localPart.slice(0, 32);
}

async function createSession(
  userId: string,
  days: number,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = addDays(days);
  await prisma.session.create({
    data: {
      userId,
      token: hashToken(token),
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function ensureDefaultFamilyForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ownedFamily: true },
  });
  if (!user) throw unauthorized();
  if (user.familyId) return user.familyId;
  if (user.ownedFamily) {
    await prisma.user.update({
      where: { id: user.id },
      data: { familyId: user.ownedFamily.id },
    });
    return user.ownedFamily.id;
  }

  const familyName = user.displayName ? `Семья ${user.displayName}` : "Семья ToyVerse";
  const birthYear = new Date().getFullYear() - 6;

  const family = await prisma.$transaction(async (tx) => {
    const created = await tx.family.create({
      data: {
        name: familyName,
        ownerId: user.id,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { familyId: created.id },
    });
    await tx.childProfile.create({
      data: {
        familyId: created.id,
        name: "Ребёнок",
        birthYear,
      },
    });
    return created;
  });

  return family.id;
}

export async function getOrCreateDefaultChild(
  userId: string,
  ownerChildId?: string,
): Promise<string> {
  const familyId = await ensureDefaultFamilyForUser(userId);

  if (ownerChildId) {
    const child = await prisma.childProfile.findFirst({
      where: { id: ownerChildId, familyId },
      select: { id: true },
    });
    if (!child) throw forbidden();
    return child.id;
  }

  const existingChild = await prisma.childProfile.findFirst({
    where: { familyId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existingChild) return existingChild.id;

  const child = await prisma.childProfile.create({
    data: {
      familyId,
      name: "Ребёнок",
      birthYear: new Date().getFullYear() - 6,
    },
    select: { id: true },
  });
  return child.id;
}

export async function createMagicLink(
  emailInput: string,
): Promise<{ email: string; link: string; token: string }> {
  const email = EmailSchema.parse(emailInput);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      displayName: displayNameFromEmail(email),
      role: UserRole.parent,
    },
  });
  await ensureDefaultFamilyForUser(user.id);

  const session = await createSession(user.id, 1 / 96);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${appUrl.replace(/\/$/, "")}/api/auth/magic-link/confirm?token=${encodeURIComponent(session.token)}`;
  return { email, link, token: session.token };
}

export async function sendMagicLinkEmail(email: string, link: string): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ToyVerse <hello@toyverse.local>";

  if (!apiKey) {
    console.log(`[auth] magic link for ${email}: ${link}`);
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Вход в ToyVerse",
      html: `<p>Нажмите на ссылку, чтобы войти в ToyVerse:</p><p><a href="${link}">Войти в ToyVerse</a></p>`,
      text: `Войти в ToyVerse: ${link}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API ${response.status}: ${await response.text()}`);
  }

  return { sent: true };
}

export async function getSessionUser(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      telegramId: session.user.telegramId,
      displayName: session.user.displayName,
      familyId: session.user.familyId,
    },
  };
}

export async function requireSessionUser(token?: string | null): Promise<SessionUser> {
  const session = await getSessionUser(token);
  if (!session) throw unauthorized();
  return session;
}

export async function confirmSessionToken(
  token?: string | null,
): Promise<{ token: string; expiresAt: Date; user: AuthUser }> {
  if (!token) throw unauthorized();
  const hashedToken = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) throw unauthorized();

  const expiresAt = addDays(30);
  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { expiresAt },
    include: { user: true },
  });

  return {
    token,
    expiresAt,
    user: {
      id: updated.user.id,
      email: updated.user.email,
      telegramId: updated.user.telegramId,
      displayName: updated.user.displayName,
      familyId: updated.user.familyId,
    },
  };
}

export async function deleteSession(token?: string | null): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token: hashToken(token) } });
}

function verifyTelegramHash(data: Record<string, unknown>, botToken: string): void {
  const hash = String(data.hash ?? "");
  if (!hash) throw badRequest("Telegram не передал подпись.");

  const dataCheckString = Object.entries(data)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${String(value)}`)
    .sort()
    .join("\n");

  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const hashBuffer = Buffer.from(hash, "hex");
  if (expectedBuffer.length !== hashBuffer.length || !timingSafeEqual(expectedBuffer, hashBuffer)) {
    throw forbidden();
  }
}

export async function createTelegramSession(
  rawAuthData: Record<string, unknown>,
): Promise<{ token: string; expiresAt: Date }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw badRequest("TELEGRAM_BOT_TOKEN не задан.");

  const authData = TelegramAuthSchema.parse(rawAuthData);
  const authDate = Number(authData.auth_date);
  const maxAgeSeconds = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS ?? 86400);
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw unauthorized();
  }
  verifyTelegramHash(authData, botToken);

  const telegramId = String(authData.id);
  const displayName =
    [authData.first_name, authData.last_name].filter(Boolean).join(" ").trim() ||
    authData.username ||
    `Telegram ${telegramId}`;

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { displayName },
    create: {
      telegramId,
      displayName,
      role: UserRole.parent,
    },
  });
  await ensureDefaultFamilyForUser(user.id);

  return createSession(user.id, 30);
}
