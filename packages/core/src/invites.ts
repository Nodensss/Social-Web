import { randomBytes } from "node:crypto";
import { prisma, UserRole, type FamilyInvite } from "@toyverse/db";
import { assertParentRole, ensureDefaultFamilyForUser } from "./auth";
import { badRequest, notFound } from "./errors";

function generateInviteCode(): string {
  // 12 случайных байт, url-safe
  return randomBytes(12).toString("base64url");
}

export type CreateFamilyInviteResult = {
  code: string;
  url: string;
};

export async function createFamilyInvite(
  userId: string,
  role: UserRole = UserRole.subscriber,
): Promise<CreateFamilyInviteResult> {
  await assertParentRole(userId);
  const familyId = await ensureDefaultFamilyForUser(userId);

  const code = generateInviteCode();
  await prisma.familyInvite.create({
    data: {
      familyId,
      code,
      role,
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${appUrl.replace(/\/$/, "")}/invite/${code}`;

  return { code, url };
}

export async function acceptFamilyInvite(userId: string, code: string): Promise<void> {
  const invite = await prisma.familyInvite.findUnique({
    where: { code },
  });

  if (!invite) {
    throw notFound("Приглашение не найдено или недействительно.");
  }

  // Обновляем пользователя и инвайт в транзакции
  await prisma.$transaction(async (tx) => {
    // Привязываем пользователя к семье инвайта и выдаём ему роль
    await tx.user.update({
      where: { id: userId },
      data: {
        familyId: invite.familyId,
        role: invite.role,
      },
    });

    // Отмечаем инвайт как использованный, если он ещё не был
    if (!invite.usedAt) {
      await tx.familyInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });
    }
  });
}

export async function listFamilyInvites(userId: string): Promise<FamilyInvite[]> {
  await assertParentRole(userId);
  const familyId = await ensureDefaultFamilyForUser(userId);

  return prisma.familyInvite.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
  });
}
