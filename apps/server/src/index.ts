import Fastify from 'fastify';
import { config } from './config.js';
import { initDb } from './db.js';
import { opencodeService } from './opencode.js';
import { llmRoutes } from './routes/llm.js';
import { generateRoutes } from './routes/generate.js';
import { sessionRoutes } from './routes/sessions.js';
import { evaluateRoutes } from './routes/evaluate.js';

async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Log all requests
  fastify.addHook('onRequest', async (request, reply) => {
    console.log('[Server] Request:', request.method, request.url, 'headers:', JSON.stringify(request.headers));
  });

  // CORS - using Fastify CORS plugin equivalent
  fastify.addHook('preHandler', (request, reply, done) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }
    done();
  });

  // Error handler
  fastify.setErrorHandler((error: any, request, reply) => {
    console.log('[Server] Error:', error.message, error.stack);
    reply.header('Access-Control-Allow-Origin', '*');
    reply.status(500).send({ error: error.message });
  });

  // Routes
  console.log('[Server] Registering routes...');
  await fastify.register(llmRoutes, { prefix: '' });
  console.log('[Server] Registered llmRoutes');
  await fastify.register(generateRoutes, { prefix: '' });
  await fastify.register(sessionRoutes, { prefix: '' });
  await fastify.register(evaluateRoutes, { prefix: '' });
  console.log('[Server] All routes registered');

  // Health check
  fastify.get('/health', async (request, reply) => {
    console.log('[Server] /health called');
    reply.header('Access-Control-Allow-Origin', '*');
    return { status: 'ok' };
  });

  // Catch-all route for debugging
  fastify.get('/*', async (request, reply) => {
    console.log('[Server] Catch-all:', request.url);
    return { error: 'Not found', path: request.url };
  });

  // Check OpenCode connection
  fastify.post('/api/check', async (request, reply) => {
    console.log('[Server] POST /api/check');
    const status = opencodeService.getStatus();
    return reply.send({ installed: status.connected });
  });

  return fastify;
}

async function start() {
  try {
    // Initialize database
    initDb();
    console.log('[DB] Initialized');

    // Initialize OpenCode
    await opencodeService.init();
    console.log('[OpenCode] Initialized');

    // Start server
    const app = await buildApp();
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`[Server] Running on http://localhost:${config.port}`);
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();