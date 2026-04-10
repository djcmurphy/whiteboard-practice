import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { opencodeService } from '../opencode.js';
import { createSession, getSession, createExample, listExamples, deleteExample } from '../db.js';
import { PROBLEM_JSON_SCHEMA } from '../types.js';

const configSchema = z.object({
  problemType: z.enum(['dsa', 'system-design', 'frontend', 'backend', 'fullstack', 'mobile', 'devops']),
  context: z.object({
    domain: z.string(),
    focusAreas: z.array(z.string()),
  }),
  spec: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']),
    topics: z.array(z.string()),
    constraints: z.array(z.string()),
    timeLimit: z.number(),
  }),
  showExamples: z.boolean().optional(),
  showConstraints: z.boolean().optional(),
  evaluation: z.object({
    allowedLanguages: z.array(z.string()),
    priorities: z.array(z.string()),
    criteria: z.array(z.object({
      name: z.string(),
      weight: z.number(),
      description: z.string(),
    })),
  }),
});

const generateSchema = z.object({
  config: configSchema,
  count: z.number().min(1).max(10).default(3),
  customNotes: z.string().optional().default(''),
});

export async function generateRoutes(fastify: FastifyInstance) {
  fastify.post('/api/generate', async (request, reply) => {
    const { config, count, customNotes } = generateSchema.parse(request.body);

    const prompt = `Generate ${count} ${config.spec.difficulty} ${config.problemType} problem(s) suitable for ${config.context.domain} domain.

${customNotes ? `Custom requirements from user: ${customNotes}\n\n` : ''}
Respond ONLY with a valid JSON array. Each problem should match this schema:
${JSON.stringify(PROBLEM_JSON_SCHEMA, null, 2)}

Return an array of ${count} problems.`;

    const result = await opencodeService.generateProblems(prompt, count);

    if (result.error) {
      return reply.status(500).send({ error: result.error });
    }

    let problems: any[];
    try {
      const parsed = JSON.parse(result.response!);
      problems = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return reply.status(500).send({ error: 'Failed to parse generated problems' });
    }

    const examples = problems.map((problem: any) => {
      const exampleId = crypto.randomUUID();
      createExample({
        id: exampleId,
        problemType: config.problemType,
        difficulty: config.spec.difficulty,
        title: problem.title || 'Untitled',
        description: problem.description || '',
        examples: problem.examples || [],
        constraints: problem.constraints || [],
        hints: problem.hints || [],
        customNotes: customNotes,
      });
      return {
        id: exampleId,
        problemType: config.problemType,
        difficulty: config.spec.difficulty,
        title: problem.title || 'Untitled',
        description: problem.description || '',
        examples: problem.examples || [],
        constraints: problem.constraints || [],
        hints: problem.hints || [],
        customNotes: customNotes,
        createdAt: new Date().toISOString(),
      };
    });

    return reply.send({ examples });
  });

  fastify.get('/api/examples', async (request, reply) => {
    const examples = listExamples();
    return reply.send({ examples });
  });

  fastify.delete('/api/examples/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteExample(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Example not found' });
    }
    return reply.send({ success: true });
  });

  fastify.post('/api/examples/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    console.log('[Generate] Start example:', id);
    
    const examples = listExamples();
    const example = examples.find(e => e.id === id);
    
    if (!example) {
      console.log('[Generate] Example not found:', id);
      return reply.status(404).send({ error: 'Example not found' });
    }

    console.log('[Generate] Found example:', example.title);

    const config: any = {
      problemType: example.problemType,
      context: { domain: '', focusAreas: [] },
      spec: {
        difficulty: example.difficulty,
        topics: [],
        constraints: example.constraints,
        timeLimit: 30,
      },
      showExamples: true,
      showConstraints: true,
      evaluation: {
        allowedLanguages: [],
        priorities: [],
        criteria: [],
      },
    };

    const problem = {
      title: example.title,
      description: example.description,
      examples: example.examples,
      constraints: example.constraints,
      hints: example.hints,
    };

    const sessionId = crypto.randomUUID();
    console.log('[Generate] Creating session:', sessionId);
    createSession(sessionId, config, problem);

    const session = getSession(sessionId);
    console.log('[Generate] Session created:', session?.id, 'problem:', session?.problem?.title);
    
    return reply.send({
      sessionId,
      problem: session!.problem,
      config,
    });
  });
}