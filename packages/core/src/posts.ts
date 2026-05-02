import { ReactionType, prisma, type Post, type Toy } from "@toyverse/db";
import { getLLM } from "@toyverse/ai";
import { z } from "zod";
import { ensureDefaultFamilyForUser } from "./auth";
import { badRequest, forbidden, notFound } from "./errors";

const CreatePostSchema = z
  .object({
    text: z.string().min(1).max(1200).optional(),
    mediaUrls: z.array(z.string().url()).max(8).optional(),
    generateWithAi: z.boolean().optional(),
    topic: z.enum(["daily", "story", "question"]).optional(),
  })
  .refine((v) => v.generateWithAi || (v.text && v.text.trim().length > 0), {
    message: "Введите текст поста или включите AI-сочинение.",
    path: ["text"],
  });

export type CreatePostInput = z.input<typeof CreatePostSchema>;

async function loadAuthorToyForUser(userId: string, authorToyId: string): Promise<Toy> {
  const familyId = await ensureDefaultFamilyForUser(userId);
  const toy = await prisma.toy.findFirst({
    where: { id: authorToyId, ownerChild: { familyId } },
  });
  if (!toy) throw forbidden();
  return toy;
}

export async function createPost(
  userId: string,
  authorToyId: string,
  input: CreatePostInput,
): Promise<Post> {
  const data = CreatePostSchema.parse(input);
  const toy = await loadAuthorToyForUser(userId, authorToyId);

  let text = data.text?.trim() ?? "";
  let generatedByAi = false;

  if (data.generateWithAi) {
    const generated = await getLLM().generatePost({
      bio: toy.bio,
      personalityTraits: toy.personalityTraits,
      catchphrases: toy.catchphrases,
      topic: data.topic,
    });
    text = generated.text.trim();
    generatedByAi = true;
  }

  const moderation = await getLLM().moderateText(text);
  if (!moderation.safe) {
    throw badRequest(`Пост не прошёл модерацию: ${moderation.reason ?? "контент небезопасен."}`);
  }

  return prisma.post.create({
    data: {
      authorToyId: toy.id,
      text,
      mediaUrls: data.mediaUrls ?? [],
      generatedByAi,
    },
  });
}

const ListFeedSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type FeedPost = Post & {
  authorToy: Toy;
  reactions: { type: ReactionType; toyId: string }[];
  _count: { comments: number; reactions: number };
};

export type FeedPage = {
  items: FeedPost[];
  nextCursor: string | null;
};

export async function listFeedForUser(
  userId: string,
  options: z.input<typeof ListFeedSchema> = {},
): Promise<FeedPage> {
  const { cursor, limit = 20 } = ListFeedSchema.parse(options);
  const familyId = await ensureDefaultFamilyForUser(userId);

  const items = await prisma.post.findMany({
    where: { authorToy: { ownerChild: { familyId } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      authorToy: true,
      reactions: { select: { type: true, toyId: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;
  return { items: page as FeedPost[], nextCursor };
}

export async function getPostForUser(userId: string, postId: string): Promise<FeedPost> {
  const familyId = await ensureDefaultFamilyForUser(userId);
  const post = await prisma.post.findFirst({
    where: { id: postId, authorToy: { ownerChild: { familyId } } },
    include: {
      authorToy: true,
      reactions: { select: { type: true, toyId: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  if (!post) throw notFound("Пост не найден.");
  return post as FeedPost;
}

export async function assertPostInFamily(userId: string, postId: string): Promise<string> {
  const familyId = await ensureDefaultFamilyForUser(userId);
  const post = await prisma.post.findFirst({
    where: { id: postId, authorToy: { ownerChild: { familyId } } },
    select: { id: true },
  });
  if (!post) throw notFound("Пост не найден.");
  return familyId;
}

export async function assertToyInFamily(
  userId: string,
  toyId: string,
  familyIdHint?: string,
): Promise<void> {
  const familyId = familyIdHint ?? (await ensureDefaultFamilyForUser(userId));
  const toy = await prisma.toy.findFirst({
    where: { id: toyId, ownerChild: { familyId } },
    select: { id: true },
  });
  if (!toy) throw forbidden();
}
