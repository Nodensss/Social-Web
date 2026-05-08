import { inngest, processToyJob } from '@toyverse/core';

export const processToyFunction = inngest.createFunction(
  { id: 'process-toy' },
  { event: 'toy/process' },
  async ({ event, step }) => {
    const { toyId, jobId } = event.data;

    // Use step.run to wrap the core logic, providing retries and observability
    await step.run('process-toy-core', async () => {
      await processToyJob(toyId, jobId);
    });

    return { message: `Toy ${toyId} processed successfully` };
  }
);
