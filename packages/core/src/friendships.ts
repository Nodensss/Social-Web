import { FriendshipStatus, prisma, type Friendship, type Toy } from "@toyverse/db";
import { z } from "zod";
import { assertParentRole, ensureDefaultFamilyForUser } from "./auth";
import { badRequest, forbidden, notFound } from "./errors";

const RequestSchema = z.object({
  fromToyId: z.string().min(1),
  toToyId: z.string().min(1),
});

export type RequestFriendshipInput = z.input<typeof RequestSchema>;

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function loadToyInFamily(familyId: string, toyId: string): Promise<Toy> {
  const toy = await prisma.toy.findFirst({
    where: { id: toyId, ownerChild: { familyId } },
  });
  if (!toy) throw forbidden();
  return toy;
}

export async function requestFriendship(
  userId: string,
  input: RequestFriendshipInput,
): Promise<Friendship> {
  await assertParentRole(userId);
  const { fromToyId, toToyId } = RequestSchema.parse(input);
  if (fromToyId === toToyId) throw badRequest("Нельзя дружить с самим собой.");

  const familyId = await ensureDefaultFamilyForUser(userId);
  await loadToyInFamily(familyId, fromToyId);
  // На MVP — дружба только между игрушками своей семьи. Подписчики/чужие
  // семьи (раздел 6.4 ТЗ, расширение через FamilyInvite) — TODO.
  await loadToyInFamily(familyId, toToyId);

  const [toyAId, toyBId] = pairKey(fromToyId, toToyId);

  const existing = await prisma.friendship.findUnique({
    where: { toyAId_toyBId: { toyAId, toyBId } },
  });
  if (existing) return existing;

  return prisma.friendship.create({
    data: {
      toyAId,
      toyBId,
      status: FriendshipStatus.accepted,
    },
  });
}

export async function acceptFriendship(
  userId: string,
  friendshipId: string,
): Promise<Friendship> {
  const familyId = await ensureDefaultFamilyForUser(userId);
  const friendship = await prisma.friendship.findFirst({
    where: {
      id: friendshipId,
      OR: [
        { toyA: { ownerChild: { familyId } } },
        { toyB: { ownerChild: { familyId } } },
      ],
    },
  });
  if (!friendship) throw notFound("Заявка на дружбу не найдена.");
  if (friendship.status === FriendshipStatus.accepted) return friendship;
  return prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: FriendshipStatus.accepted },
  });
}

export type FriendOfToy = { friendship: Friendship; friend: Toy };

export async function listFriendsForToy(userId: string, toyId: string): Promise<FriendOfToy[]> {
  const familyId = await ensureDefaultFamilyForUser(userId);
  await loadToyInFamily(familyId, toyId);

  const rows = await prisma.friendship.findMany({
    where: {
      OR: [{ toyAId: toyId }, { toyBId: toyId }],
      status: FriendshipStatus.accepted,
    },
    include: { toyA: true, toyB: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    friendship: row,
    friend: row.toyAId === toyId ? row.toyB : row.toyA,
  }));
}
