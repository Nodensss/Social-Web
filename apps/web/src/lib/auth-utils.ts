import { auth } from '@/auth';
import { prisma } from '@toyverse/db';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { family: true }
  });

  if (!user?.familyId) {
    throw new Error('User does not belong to a family');
  }

  return { user, familyId: user.familyId };
}

export async function verifyToyBelongsToFamily(toyId: string, familyId: string) {
  const toy = await prisma.toy.findUnique({
    where: { id: toyId },
    include: { ownerChild: true }
  });

  if (!toy || toy.ownerChild.familyId !== familyId) {
    throw new Error('Forbidden: Toy does not belong to your family');
  }

  return toy;
}
