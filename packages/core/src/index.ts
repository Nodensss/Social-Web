import { EventSchemas, Inngest } from 'inngest';
import { prisma } from '@toyverse/db';
import { generateToyBio, stylizeImage, generateToyPost, moderateText } from '@toyverse/ai';

// --- Inngest Setup ---

type ProcessToyJobEvent = {
  data: {
    toyId: string;
    jobId: string; // the ProcessingJob ID
  };
};

export const inngest = new Inngest({
  id: 'toyverse-app',
  schemas: new EventSchemas().fromRecord<{
    'toy/process': ProcessToyJobEvent;
  }>(),
});

// --- Core Logic ---

export async function createToy(params: {
  ownerChildId: string;
  originalPhotoUrl: string;
  species?: string;
  color?: string;
  childDescription?: string;
}) {
  const { ownerChildId, originalPhotoUrl, species, color, childDescription } = params;

  // 1. Create Toy with Processing status
  const toy = await prisma.toy.create({
    data: {
      ownerChildId,
      originalPhotoUrl,
      species,
      status: 'PROCESSING',
    },
  });

  // 2. Create the ProcessingJob
  const job = await prisma.processingJob.create({
    data: {
      toyId: toy.id,
      kind: 'IMAGE_STYLIZE', // Start with image, bio will follow
      status: 'PENDING',
      payload: { species, color, childDescription } as any, // Storing extra context
    },
  });

  // 3. Send event to Inngest
  await inngest.send({
    name: 'toy/process',
    data: {
      toyId: toy.id,
      jobId: job.id,
    },
  });

  return toy;
}

export async function processToyJob(toyId: string, jobId: string) {
  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const toy = await prisma.toy.findUnique({ where: { id: toyId } });
  if (!toy) throw new Error(`Toy ${toyId} not found`);

  try {
    // Mark as processing
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    const payload = job.payload as any;

    // Phase 1: Stylize Image
    // (If we were doing full multi-step, this might be separate jobs. MVP: do it sequentially here)
    const processedUrl = await stylizeImage(toy.originalPhotoUrl || '');
    
    // Phase 2: Generate Bio
    const bioData = await generateToyBio({
      species: toy.species || 'other',
      color: payload?.color,
      childDescription: payload?.childDescription,
    });

    // Save results
    await prisma.$transaction([
      prisma.toy.update({
        where: { id: toyId },
        data: {
          processedImageUrl: processedUrl,
          fullName: bioData.fullName,
          species: bioData.species,
          bio: bioData.bio,
          personalityTraits: bioData.personalityTraits,
          catchphrases: bioData.catchphrases,
          status: 'READY',
        },
      }),
      prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'READY',
          result: { bioData, processedUrl } as any,
          kind: 'BIO_GENERATE', // We just note it did everything
        },
      }),
    ]);

    return { success: true };
  } catch (error: any) {
    console.error('Failed to process toy:', error);
    await prisma.$transaction([
      prisma.toy.update({
        where: { id: toyId },
        data: { status: 'FAILED' },
      }),
      prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      }),
    ]);
    throw error;
  }
}

// --- Feed & Interactions ---

export async function publishPost(params: {
  authorToyId: string;
  text?: string;
  mediaUrls?: string[];
  theme?: string; // used for AI generation
  generateByAi?: boolean;
}) {
  const { authorToyId, text, mediaUrls, theme, generateByAi } = params;

  let finalContent = text || '';

  if (generateByAi) {
    const toy = await prisma.toy.findUnique({ where: { id: authorToyId } });
    if (!toy) throw new Error('Toy not found');
    
    finalContent = await generateToyPost({
      fullName: toy.fullName || 'Игрушка',
      bio: toy.bio || '',
      traits: toy.personalityTraits,
      catchphrases: toy.catchphrases,
    }, theme);
  } else {
    // Moderate user-provided text
    const mod = await moderateText(finalContent);
    finalContent = mod.filteredText;
  }

  const post = await prisma.post.create({
    data: {
      authorToyId,
      text: finalContent,
      mediaUrls: mediaUrls || [],
      generatedByAi: !!generateByAi,
    },
    include: {
      authorToy: true,
    }
  });

  return post;
}

export async function addComment(params: { postId: string; authorToyId: string; text: string }) {
  const mod = await moderateText(params.text);
  
  return prisma.comment.create({
    data: {
      postId: params.postId,
      authorToyId: params.authorToyId,
      text: mod.filteredText,
    },
    include: { authorToy: true }
  });
}

export async function addReaction(params: { postId: string; toyId: string; type: 'HEART' | 'STAR' | 'LAUGH' }) {
  // Check if reaction already exists
  const existing = await prisma.reaction.findUnique({
    where: {
      postId_toyId_type: {
        postId: params.postId,
        toyId: params.toyId,
        type: params.type,
      }
    }
  });

  if (existing) {
    // Toggle off
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { added: false };
  }

  // Toggle on
  await prisma.reaction.create({
    data: params
  });
  return { added: true };
}

export async function getFamilyFeed(familyId: string, limit = 20) {
  // Find all toys in this family
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: { children: { include: { toys: true } } }
  });

  if (!family) throw new Error('Family not found');

  const toyIds = family.children.flatMap(c => c.toys.map(t => t.id));

  // Get posts from these toys
  const posts = await prisma.post.findMany({
    where: { authorToyId: { in: toyIds } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      authorToy: true,
      comments: { include: { authorToy: true }, orderBy: { createdAt: 'asc' } },
      reactions: true,
    }
  });

  return posts;
}

export async function getToyProfile(toyId: string) {
  return prisma.toy.findUnique({
    where: { id: toyId },
    include: {
      ownerChild: { include: { family: true } },
      posts: { orderBy: { createdAt: 'desc' }, take: 5 },
      friendshipsA: { include: { toyB: true } },
      friendshipsB: { include: { toyA: true } }
    }
  });
}
