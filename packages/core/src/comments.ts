import { prisma, type Comment, type Toy } from "@toyverse/db";
import { getLLM } from "@toyverse/ai";
import { z } from "zod";
import { badRequest } from "./errors";
import { assertPostInFamily, assertToyInFamily } from "./posts";

const CreateCommentSchema = z.object({
  asToyId: z.string().min(1),
  text: z.string().min(1).max(800),
});

export type CreateCommentInput = z.input<typeof CreateCommentSchema>;
export type CommentWithAuthor = Comment & { authorToy: Toy };

export async function createComment(
  userId: string,
  postId: string,
  input: CreateCommentInput,
): Promise<CommentWithAuthor> {
  const { asToyId, text } = CreateCommentSchema.parse(input);
  const familyId = await assertPostInFamily(userId, postId);
  await assertToyInFamily(userId, asToyId, familyId);

  const moderation = await getLLM().moderateText(text);
  if (!moderation.safe) {
    throw badRequest(
      `Комментарий не прошёл модерацию: ${moderation.reason ?? "контент небезопасен."}`,
    );
  }

  return prisma.comment.create({
    data: { postId, authorToyId: asToyId, text: text.trim() },
    include: { authorToy: true },
  });
}

export async function listCommentsForPost(
  userId: string,
  postId: string,
): Promise<CommentWithAuthor[]> {
  await assertPostInFamily(userId, postId);
  return prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: { authorToy: true },
  });
}
