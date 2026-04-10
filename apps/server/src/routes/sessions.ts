import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSession, updateSession, listSessions } from '../db.js';

const updateSessionSchema = z.object({
  sessionId: z.string(),
  notes: z.string().optional(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    answer: z.string().optional(),
    timestamp: z.number(),
    parentId: z.string().optional(),
  })).optional(),
  excalidrawData: z.any().optional(),
  elapsedSeconds: z.number().optional(),
  isPaused: z.boolean().optional(),
});

export async function sessionRoutes(fastify: FastifyInstance) {
  // Get all sessions
  fastify.get('/api/sessions', async (request, reply) => {
    const sessions = listSessions();
    return reply.send(sessions);
  });

  // Get single session
  fastify.get('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getSession(id);
    
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    
    return reply.send(session);
  });

  // Update session
  fastify.put('/api/sessions', async (request, reply) => {
    const body = updateSessionSchema.parse(request.body);
    
    const success = updateSession(body.sessionId, {
      notes: body.notes,
      questions: body.questions,
      excalidrawData: body.excalidrawData,
      elapsedSeconds: body.elapsedSeconds,
      isPaused: body.isPaused,
    });
    
    if (!success) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    
    return reply.send({ success: true });
  });
}