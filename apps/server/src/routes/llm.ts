import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { opencodeService } from '../opencode.js';

const setModelSchema = z.object({
  modelId: z.string(),
});

export async function llmRoutes(fastify: FastifyInstance) {
  fastify.get('/api/llm', async (request, reply) => {
    console.log('[LLM] Handler: About to call getStatus');
    try {
      const status = opencodeService.getStatus();
      console.log('[LLM] Handler: Got status:', JSON.stringify(status));
      return reply.send(status);
    } catch (e: any) {
      console.log('[LLM] Handler: Error:', e.message, e.stack);
      return reply.status(500).send({ error: e.message });
    }
  });

  fastify.post('/api/llm', async (request, reply) => {
    const body = setModelSchema.parse(request.body);
    
    try {
      const status = await opencodeService.setModel(body.modelId);
      return reply.send(status);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  fastify.post('/api/test', async (request, reply) => {
    const testSchema = z.object({
      prompt: z.string(),
      problem: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        examples: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional(),
        hints: z.array(z.string()).optional(),
      }).optional(),
    });

    const { prompt, problem } = testSchema.parse(request.body);

    const problemDetails: string[] = [];
    if (problem?.title) problemDetails.push(`Title: ${problem.title}`);
    if (problem?.description) problemDetails.push(`\nDescription: ${problem.description}`);
    if (problem?.examples?.length) problemDetails.push(`\nExamples:\n${problem.examples.join('\n')}`);
    if (problem?.constraints?.length) problemDetails.push(`\nConstraints:\n${problem.constraints.join('\n')}`);
    if (problem?.hints?.length) problemDetails.push(`\nHints:\n${problem.hints.join('\n')}`);

    const systemPrompt = `You are an interviewer evaluating a candidate in a whiteboard technical exam.

## Problem
${problemDetails.join('\n')}

## Instructions
- Answer the candidate's questions directly and professionally
- If something isn't specified, briefly note the assumption
- Do not explain what the problem is - just answer the question
- Keep responses short and focused`;

    const result = await opencodeService.prompt(`${systemPrompt}\n\nCandidate asks: ${prompt}`);
    return reply.send(result);
  });
}