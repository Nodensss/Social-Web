import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { JobKind } from "@toyverse/db";

export const TOY_PROCESSING_QUEUE = "toy-processing";

export type ToyProcessingQueueJob = {
  processingJobId: string;
  toyId: string;
  kind: JobKind;
};

let connection: IORedis | undefined;
let queue: Queue<ToyProcessingQueueJob> | undefined;

function getConnection(): IORedis {
  connection ??= new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  return connection;
}

export function getToyProcessingQueue(): Queue<ToyProcessingQueueJob> {
  queue ??= new Queue<ToyProcessingQueueJob>(TOY_PROCESSING_QUEUE, {
    connection: getConnection(),
  });
  return queue;
}

export async function enqueueToyProcessingJob(data: ToyProcessingQueueJob): Promise<void> {
  await getToyProcessingQueue().add(data.kind, data, {
    jobId: data.processingJobId,
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  });
}

export function getToyProcessingConnection(): IORedis {
  return getConnection();
}
