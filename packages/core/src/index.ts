import { EventSchemas, Inngest } from 'inngest';
import { prisma } from '@toyverse/db';
import { generateToyBio, stylizeImage } from '@toyverse/ai';

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
