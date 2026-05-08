import { serve } from 'inngest/next';
import { inngest } from '@toyverse/core';
import { processToyFunction } from '../../../inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processToyFunction],
});
