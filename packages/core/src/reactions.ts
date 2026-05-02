import { ReactionType, prisma, type Reaction } from "@toyverse/db";
import { z } from "zod";
import { assertPostInFamily, assertToyInFamily } from "./posts";

const ReactionSchema = z.object({
  asToyId: z.string().min(1),
  type: z.nativeEnum(ReactionType).optional(),
});

export type ToggleReactionInput = z.input<typeof ReactionSchema>;
export type ToggleReactionResult = { reaction: Reaction | null; removed: boolean };

export async function toggleReaction(
  userId: string,
  postId: string,
  input: ToggleReactionInput,
): Promise<ToggleReactionResult> {
  const { asToyId, type = ReactionType.heart } = ReactionSchema.parse(input);
  const familyId = await assertPostInFamily(userId, postId);
  await assertToyInFamily(userId, asToyId, familyId);

  const existing = await prisma.reaction.findUnique({
    where: { postId_toyId_type: { postId, toyId: asToyId, type } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { reaction: null, removed: true };
  }

  const reaction = await prisma.reaction.create({
    data: { postId, toyId: asToyId, type },
  });
  return { reaction, removed: false };
}
