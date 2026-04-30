import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const toyQueue = new Queue("toy-processing", { connection });

// Минимальный воркер-заглушка. Реальные обработчики (image_stylize, model_3d,
// bio_generate) — этап 2 ТЗ.
new Worker(
  "toy-processing",
  async (job) => {
    console.log(`[jobs] received ${job.name}`, job.data);
    return { ok: true };
  },
  { connection },
);

console.log("[jobs] worker started, queue=toy-processing");
