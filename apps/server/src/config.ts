import { z } from 'zod';

export const configSchema = z.object({
  port: z.number().default(3001),
  llmRoot: z.string(),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse({
  port: parseInt(process.env.PORT || '3001'),
  llmRoot: process.env.LLM_ROOT || './llm',
});