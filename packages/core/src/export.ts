import { prisma } from "@toyverse/db";
import { assertParentRole, ensureDefaultFamilyForUser } from "./auth";
import { notFound } from "./errors";

export type FamilyExport = {
  exportedAt: string;
  family: {
    id: string;
    name: string;
    createdAt: string;
  };
  children: Array<{
    id: string;
    name: string;
    birthYear: number;
    createdAt: string;
  }>;
  toys: Array<{
    id: string;
    fullName: string;
    species: string;
    bio: string;
    personalityTraits: string[];
    catchphrases: string[];
    originalPhotoUrl: string;
    processedImageUrl: string | null;
    model3dUrl: string | null;
    status: string;
    createdAt: string;
  }>;
  posts: Array<{
    id: string;
    authorToyId: string;
    text: string;
    mediaUrls: string[];
    generatedByAi: boolean;
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    postId: string;
    authorToyId: string;
    text: string;
    createdAt: string;
  }>;
  reactions: Array<{
    id: string;
    postId: string;
    toyId: string;
    type: string;
    createdAt: string;
  }>;
  friendships: Array<{
    id: string;
    toyAId: string;
    toyBId: string;
    status: string;
    createdAt: string;
  }>;
};

export async function exportFamily(userId: string): Promise<FamilyExport> {
  await assertParentRole(userId);
  const familyId = await ensureDefaultFamilyForUser(userId);
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw notFound("Семья не найдена.");

  const [children, toys] = await Promise.all([
    prisma.childProfile.findMany({ where: { familyId } }),
    prisma.toy.findMany({ where: { ownerChild: { familyId } } }),
  ]);
  const toyIds = toys.map((t) => t.id);

  const [posts, comments, reactions, friendships] = await Promise.all([
    prisma.post.findMany({ where: { authorToyId: { in: toyIds } } }),
    prisma.comment.findMany({ where: { authorToyId: { in: toyIds } } }),
    prisma.reaction.findMany({ where: { toyId: { in: toyIds } } }),
    prisma.friendship.findMany({
      where: {
        OR: [{ toyAId: { in: toyIds } }, { toyBId: { in: toyIds } }],
      },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    family: { id: family.id, name: family.name, createdAt: family.createdAt.toISOString() },
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      birthYear: c.birthYear,
      createdAt: c.createdAt.toISOString(),
    })),
    toys: toys.map((t) => ({
      id: t.id,
      fullName: t.fullName,
      species: t.species,
      bio: t.bio,
      personalityTraits: t.personalityTraits,
      catchphrases: t.catchphrases,
      originalPhotoUrl: t.originalPhotoUrl,
      processedImageUrl: t.processedImageUrl,
      model3dUrl: t.model3dUrl,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    posts: posts.map((p) => ({
      id: p.id,
      authorToyId: p.authorToyId,
      text: p.text,
      mediaUrls: p.mediaUrls,
      generatedByAi: p.generatedByAi,
      createdAt: p.createdAt.toISOString(),
    })),
    comments: comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      authorToyId: c.authorToyId,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
    })),
    reactions: reactions.map((r) => ({
      id: r.id,
      postId: r.postId,
      toyId: r.toyId,
      type: r.type,
      createdAt: r.createdAt.toISOString(),
    })),
    friendships: friendships.map((f) => ({
      id: f.id,
      toyAId: f.toyAId,
      toyBId: f.toyBId,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

export async function deleteFamilyData(userId: string): Promise<void> {
  await assertParentRole(userId);
  const familyId = await ensureDefaultFamilyForUser(userId);
  await prisma.$transaction(async (tx) => {
    // Отвязываем всех участников, чтобы FK не блокировал удаление семьи.
    await tx.user.updateMany({ where: { familyId }, data: { familyId: null } });
    // ChildProfile.onDelete: Cascade → Toy → Post/Comment/Reaction/Friendship
    // удалятся каскадно вместе с семьёй.
    await tx.family.delete({ where: { id: familyId } });
  });
}
