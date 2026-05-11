import { getImageStylizer, getLLM, getThreeD } from "@toyverse/ai";
import { JobKind, JobStatus, prisma, ToyStatus, type Prisma, type Toy } from "@toyverse/db";
import { z } from "zod";
import { badRequest, notFound } from "./errors";
import { assertParentRole, ensureDefaultFamilyForUser, getOrCreateDefaultChild } from "./auth";
import { enqueueToyProcessingJob } from "./queue";
import { copyRemoteImageToStorage, uploadObject } from "./storage";

const ToyPatchSchema = z.object({
  fullName: z.string().min(3).max(120).optional(),
  bio: z.string().max(1200).optional(),
  personalityTraits: z.array(z.string().min(1).max(40)).max(8).optional(),
  catchphrases: z.array(z.string().min(1).max(120)).max(6).optional(),
});

export type CreateToyInput = {
  userId: string;
  ownerChildId?: string;
  file: {
    bytes: Buffer | Uint8Array;
    contentType: string;
    originalName?: string;
  };
  speciesHint?: string;
  colorHint?: string;
  childDescription?: string;
};

export type CreateToyResult = {
  toy: Toy;
};

function recordFromJson(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredJobKinds(): JobKind[] {
  return [JobKind.image_stylize, JobKind.bio_generate];
}

function allJobKinds(): JobKind[] {
  const kinds = requiredJobKinds();
  if (process.env.FEATURE_3D_ENABLED === "true") kinds.push(JobKind.model_3d);
  return kinds;
}

async function assertToyAccess(userId: string, toyId: string) {
  const familyId = await ensureDefaultFamilyForUser(userId);
  const toy = await prisma.toy.findFirst({
    where: {
      id: toyId,
      ownerChild: { familyId },
    },
    include: {
      ownerChild: true,
    },
  });
  if (!toy) throw notFound("Игрушка не найдена.");
  return toy;
}

async function createProcessingJobs(toyId: string, payload: Prisma.InputJsonValue): Promise<void> {
  for (const kind of allJobKinds()) {
    const processingJob = await prisma.processingJob.create({
      data: {
        toyId,
        kind,
        status: JobStatus.queued,
        payload,
      },
    });
    await enqueueToyProcessingJob({
      processingJobId: processingJob.id,
      toyId,
      kind,
    });
  }
}

export async function createToy(input: CreateToyInput): Promise<CreateToyResult> {
  await assertParentRole(input.userId);
  const ownerChildId = await getOrCreateDefaultChild(input.userId, input.ownerChildId);
  const uploaded = await uploadObject({
    bytes: input.file.bytes,
    contentType: input.file.contentType,
    originalName: input.file.originalName,
    prefix: "toys/original",
  });

  const toy = await prisma.toy.create({
    data: {
      ownerChildId,
      fullName: "Игрушка обрабатывается",
      species: input.speciesHint?.trim() || "toy",
      originalPhotoUrl: uploaded.url,
      personalityTraits: [],
      catchphrases: [],
      status: ToyStatus.processing,
    },
  });

  await createProcessingJobs(toy.id, {
    speciesHint: input.speciesHint,
    colorHint: input.colorHint,
    childDescription: input.childDescription,
  });

  return { toy };
}

export async function listToysForUser(userId: string) {
  const familyId = await ensureDefaultFamilyForUser(userId);
  return prisma.toy.findMany({
    where: { ownerChild: { familyId } },
    orderBy: { createdAt: "desc" },
    include: { ownerChild: true },
  });
}

export async function getToyForUser(userId: string, toyId: string) {
  return assertToyAccess(userId, toyId);
}

export async function updateToyForUser(userId: string, toyId: string, patch: unknown) {
  await assertParentRole(userId);
  await assertToyAccess(userId, toyId);
  const data = ToyPatchSchema.parse(patch);
  return prisma.toy.update({
    where: { id: toyId },
    data,
  });
}

export async function publishToyToFeed(userId: string, toyId: string) {
  await assertParentRole(userId);
  const toy = await assertToyAccess(userId, toyId);
  if (toy.status !== ToyStatus.ready) {
    throw badRequest("Игрушка ещё обрабатывается.");
  }

  const text = `Знакомьтесь: ${toy.fullName}! ${toy.bio}`;
  const moderation = await getLLM().moderateText(text);
  if (!moderation.safe) {
    throw new Error(`Публикация не прошла модерацию: ${moderation.reason ?? "без причины"}`);
  }

  return prisma.post.create({
    data: {
      authorToyId: toy.id,
      text,
      mediaUrls: [toy.processedImageUrl ?? toy.originalPhotoUrl],
      generatedByAi: false,
    },
  });
}

async function refreshToyStatus(toyId: string): Promise<void> {
  const jobs = await prisma.processingJob.findMany({
    where: { toyId, kind: { in: requiredJobKinds() } },
  });

  if (jobs.some((job) => job.status === JobStatus.failed)) {
    await prisma.toy.update({ where: { id: toyId }, data: { status: ToyStatus.failed } });
    return;
  }

  if (
    requiredJobKinds().every((kind) =>
      jobs.some((job) => job.kind === kind && job.status === JobStatus.done),
    )
  ) {
    await prisma.toy.update({ where: { id: toyId }, data: { status: ToyStatus.ready } });
  }
}

function bioModerationText(bio: {
  fullName: string;
  species: string;
  personalityTraits: string[];
  catchphrases: string[];
  bio: string;
}): string {
  return [
    bio.fullName,
    bio.species,
    bio.bio,
    bio.personalityTraits.join(", "),
    bio.catchphrases.join(" "),
  ].join("\n");
}

export async function processToyJob(processingJobId: string) {
  const job = await prisma.processingJob.update({
    where: { id: processingJobId },
    data: { status: JobStatus.running, error: null },
    include: { toy: true },
  });

  try {
    const payload = recordFromJson(job.payload);
    if (job.kind === JobKind.image_stylize) {
      const result = await getImageStylizer().stylize({
        sourceUrl: job.toy.originalPhotoUrl,
        species: job.toy.species,
      });
      const processedImageUrl =
        result.stylizedUrl === job.toy.originalPhotoUrl ||
        process.env.PERSIST_AI_OUTPUTS === "false"
          ? result.stylizedUrl
          : await copyRemoteImageToStorage(result.stylizedUrl, "toys/processed");

      await prisma.toy.update({
        where: { id: job.toyId },
        data: { processedImageUrl },
      });
      await prisma.processingJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.done,
          providerJobId: result.providerJobId,
          result: { processedImageUrl },
        },
      });
    }

    if (job.kind === JobKind.bio_generate) {
      const bio = await getLLM().generateBio({
        speciesHint: optionalString(payload.speciesHint) ?? job.toy.species,
        colorHint: optionalString(payload.colorHint),
        childDescription: optionalString(payload.childDescription),
      });
      const moderation = await getLLM().moderateText(bioModerationText(bio));
      if (!moderation.safe) {
        throw new Error(`AI-био не прошло модерацию: ${moderation.reason ?? "без причины"}`);
      }

      await prisma.toy.update({
        where: { id: job.toyId },
        data: {
          fullName: bio.fullName,
          species: bio.species,
          personalityTraits: bio.personalityTraits,
          catchphrases: bio.catchphrases,
          bio: bio.bio,
        },
      });
      await prisma.processingJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.done,
          result: bio,
        },
      });
    }

    if (job.kind === JobKind.model_3d) {
      const result = await getThreeD().generate({ sourceUrl: job.toy.originalPhotoUrl });
      await prisma.toy.update({
        where: { id: job.toyId },
        data: { model3dUrl: result.glbUrl },
      });
      await prisma.processingJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.done,
          providerJobId: result.providerJobId,
          result,
        },
      });
    }

    await refreshToyStatus(job.toyId);
    return { ok: true };
  } catch (error) {
    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.failed,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    await refreshToyStatus(job.toyId);
    throw error;
  }
}
