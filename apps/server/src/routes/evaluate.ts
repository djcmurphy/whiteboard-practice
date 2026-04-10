import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { opencodeService } from '../opencode.js';
import { saveEvaluation, getEvaluation } from '../db.js';

const evaluateSchema = z.object({
  sessionId: z.string(),
  notes: z.string(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    answer: z.string().optional(),
    timestamp: z.number(),
    parentId: z.string().optional(),
  })),
  config: z.object({
    evaluation: z.object({
      criteria: z.array(z.object({
        name: z.string(),
        weight: z.number(),
        description: z.string(),
      })),
    }),
  }),
  problem: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export async function evaluateRoutes(fastify: FastifyInstance) {
  fastify.post('/api/evaluate', async (request, reply) => {
    const { sessionId, notes, questions, config, problem } = evaluateSchema.parse(request.body);

    const prompt = `Evaluate this whiteboard session.

## Problem
${problem.title}
${problem.description}

## Candidate's Notes
${notes || 'No notes provided'}

## Questions from Candidate
${questions.map(q => `- ${q.text}`).join('\n') || 'None'}

## Evaluation Criteria
${config.evaluation.criteria.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Respond ONLY with valid JSON:
{
  "scores": { "criterion-name": { "score": 1-5, "maxScore": 5, "feedback": "..." } },
  "overallScore": 0-100,
  "grade": "excellent" | "good" | "needs-improvement" | "poor",
  "strengths": ["..."],
  "improvements": ["..."],
  "suggestions": ["..."],
  "followUpQuestions": ["..."] (optional)
}`;

    const result = await opencodeService.evaluate(prompt);

    if (result.error) {
      return reply.status(500).send({ error: result.error });
    }

    let parsedResult: any;
    try {
      const jsonMatch = result.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = {};
      }
    } catch {
      return reply.status(500).send({ error: 'Failed to parse evaluation response' });
    }

    const evaluationId = crypto.randomUUID();
    saveEvaluation(evaluationId, sessionId, parsedResult);

    return reply.send(parsedResult);
  });
}