import "dotenv/config";
import {
  getToyProcessingConnection,
  processToyJob,
  TOY_PROCESSING_QUEUE,
  type ToyProcessingQueueJob,
} from "@toyverse/core";
import { Worker } from "bullmq";

const worker = new Worker<ToyProcessingQueueJob>(
  TOY_PROCESSING_QUEUE,
  async (job) => {
    console.log(`[jobs] ${job.name} started`, job.data);
    return processToyJob(job.data.processingJobId);
  },
  { connection: getToyProcessingConnection() },
);

worker.on("completed", (job) => {
  console.log(`[jobs] ${job.name} completed`, job.data);
});

worker.on("failed", (job, error) => {
  console.error(`[jobs] ${job?.name ?? "unknown"} failed`, error);
});

console.log(`[jobs] worker started, queue=${TOY_PROCESSING_QUEUE}`);
