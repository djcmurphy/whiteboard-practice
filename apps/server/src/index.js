import http from 'http';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createOpencode } from "@opencode-ai/sdk";
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ProblemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  examples: z.array(z.string()).min(1),
  constraints: z.array(z.string()).min(1),
  hints: z.array(z.string()).optional(),
});

const ProblemJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Problem title' },
    description: { type: 'string', description: 'Detailed problem description' },
    examples: { type: 'array', items: { type: 'string' }, description: 'Examples of the problem' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'Problem constraints' },
    hints: { type: 'array', items: { type: 'string' }, description: 'Hints for solving' }
  },
  required: ['title', 'description', 'examples', 'constraints']
};

const SERVER_PORT = 3001;
const LLM_ROOT = path.resolve(__dirname, '../../../llm');

let client = null;
let opencodeServer = null;
let llmContextLoaded = false;
let opencodeSessionId = null;

const db = new Database(path.join(__dirname, '../data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    config TEXT NOT NULL,
    problem TEXT,
    notes TEXT,
    questions TEXT,
    excalidraw_data TEXT,
    status TEXT DEFAULT 'generated',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    scores TEXT,
    overall_score INTEGER,
    grade TEXT,
    strengths TEXT,
    improvements TEXT,
    suggestions TEXT,
    follow_up_questions TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
`);

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function getAllInstructions() {
  const base = readFile(path.join(LLM_ROOT, 'instructions/base.md'));
  const dsa = readFile(path.join(LLM_ROOT, 'instructions/dsa.md'));
  const systemDesign = readFile(path.join(LLM_ROOT, 'instructions/system-design.md'));
  const frontend = readFile(path.join(LLM_ROOT, 'instructions/frontend.md'));
  const backend = readFile(path.join(LLM_ROOT, 'instructions/backend.md'));
  const behavioral = readFile(path.join(LLM_ROOT, 'instructions/behavioral.md'));
  
  return `${base}

--- DSA TYPE ---
${dsa}

--- SYSTEM DESIGN TYPE ---
${systemDesign}

--- FRONTEND TYPE ---
${frontend}

--- BACKEND TYPE ---
${backend}

--- BEHAVIORAL TYPE ---
${behavioral}
`;
}

async function runOpenCode(prompt) {
  try {
    if (!client) {
      return { error: 'OpenCode client not initialized' };
    }

    let sessionId = opencodeSessionId;
    
    if (!sessionId) {
      const createResult = await client.session.create({
        body: { title: 'Whiteboard Practice Session' }
      });
      sessionId = createResult.data.id;
      opencodeSessionId = sessionId;
      console.log('[runOpenCode] Created session:', sessionId);
    }
    
    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: prompt }]
      }
    });
    
    console.log('[runOpenCode] Result keys:', Object.keys(result));
    console.log('[runOpenCode] Result data:', JSON.stringify(result.data).slice(0, 800));
    
    const parts = result.data?.info?.parts || result.data?.parts || [];
    const textParts = parts.filter(p => p.type === 'text');
    const text = textParts.map(p => p.text || '').join('');
    return { response: text };
  } catch (error) {
    console.log('[runOpenCode] Error:', error.message);
    return { error: error.message };
  }
}

async function loadLlmContext() {
  if (llmContextLoaded) return;
  
  const instructions = getAllInstructions();
  const initPrompt = `You are an expert technical interview question generator and evaluator. Read and understand these instructions thoroughly. After this, I will send you specific parameters and you will generate problems or evaluate solutions based on these instructions.

${instructions}

Reply with "UNDERSTOOD" if you have read and understood all instructions.`;

  console.log('[loadLlmContext] Loading instructions into LLM...');
  await runOpenCode(initPrompt);
  llmContextLoaded = true;
  console.log('[loadLlmContext] LLM context loaded');
}

function generateId() {
  return crypto.randomUUID();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${SERVER_PORT}`);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Check OpenCode connection
  if (url.pathname === '/api/check' && req.method === 'POST') {
    try {
      if (client) {
        await client.global.health();
        res.writeHead(200);
        res.end(JSON.stringify({ installed: true }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({ installed: false }));
      }
    } catch {
      res.writeHead(200);
      res.end(JSON.stringify({ installed: false }));
    }
    return;
  }

  // Test prompt endpoint
  if (url.pathname === '/api/test' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const { prompt } = JSON.parse(body);
    const result = await runOpenCode(prompt);
    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  }

  // Generate problem from config
  if (url.pathname === '/api/generate' && req.method === 'POST') {
    console.log('[generate] Received request');
    await loadLlmContext();
    
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const config = JSON.parse(body);
    console.log('[generate] Config:', JSON.stringify(config));

    const prompt = `Generate a ${config.spec.difficulty} ${config.problemType} problem suitable for a ${config.context.role} working in ${config.context.domain}.

Respond ONLY with valid JSON:
{
  "title": "problem title",
  "description": "detailed problem description",
  "examples": ["example 1", "example 2"],
  "constraints": ["constraint 1", "constraint 2"],
  "hints": ["hint 1", "hint 2"]
}`;

    const result = await runOpenCode(prompt);
    console.log('[generate] Result:', JSON.stringify(result).slice(0, 500));
    
    let parsedResult = result;
    if (result.response) {
      try {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsedResult = { title: result.response.substring(0, 50), description: result.response };
      }
    }
    
    // Validate with Zod
    const validation = ProblemSchema.safeParse(parsedResult);
    if (!validation.success) {
      console.log('[generate] Validation failed:', validation.error.message);
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid problem format', details: validation.error.message }));
      return;
    }
    
    if (parsedResult.error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: parsedResult.error }));
      return;
    }

    const sessionId = generateId();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, config, problem, status)
      VALUES (?, ?, ?, 'generated')
    `);
    
    stmt.run(sessionId, JSON.stringify(config), JSON.stringify(parsedResult));
    
    res.writeHead(200);
    res.end(JSON.stringify({ 
      sessionId, 
      problem: parsedResult,
      config 
    }));
    return;
  }

  // Save session
  if (url.pathname === '/api/sessions' && req.method === 'PUT') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const { sessionId, notes, questions, excalidrawData } = JSON.parse(body);
    
    const stmt = db.prepare(`
      UPDATE sessions 
      SET notes = ?, questions = ?, excalidraw_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(JSON.stringify(notes), JSON.stringify(questions), JSON.stringify(excalidrawData), sessionId);
    
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Get session
  if (url.pathname.startsWith('/api/sessions/') && req.method === 'GET') {
    const sessionId = url.pathname.split('/').pop();
    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
    const session = stmt.get(sessionId);
    
    if (!session) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      ...session,
      config: JSON.parse(session.config),
      problem: JSON.parse(session.problem),
      notes: session.notes ? JSON.parse(session.notes) : [],
      questions: session.questions ? JSON.parse(session.questions) : [],
      excalidrawData: session.excalidraw_data ? JSON.parse(session.excalidraw_data) : null
    }));
    return;
  }

  // List sessions
  if (url.pathname === '/api/sessions' && req.method === 'GET') {
    const stmt = db.prepare('SELECT id, config, problem, status, created_at, updated_at FROM sessions ORDER BY updated_at DESC');
    const sessions = stmt.all();
    
    res.writeHead(200);
    res.end(JSON.stringify(sessions.map(s => ({
      id: s.id,
      problem: s.problem ? JSON.parse(s.problem) : null,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))));
    return;
  }

  // Evaluate
  if (url.pathname === '/api/evaluate' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const { sessionId, notes, questions, config, problem } = JSON.parse(body);
    
    const prompt = `Evaluate this whiteboard session.

## Problem
${problem?.title || 'N/A'}
${problem?.description || ''}

## Candidate's Notes
${notes || 'No notes provided'}

## Questions from Candidate
${questions?.map(q => `- ${q.text}`).join('\n') || 'None'}

## Evaluation Criteria
${config.evaluation.criteria.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Respond ONLY with valid JSON:
{
  "scores": { "criterion-name": { "score": 1-5, "maxScore": 5, "feedback": "..." } },
  "overallScore": 0-100,
  "grade": "excellent|good|needs-improvement|poor",
  "strengths": ["..."],
  "improvements": ["..."],
  "suggestions": ["..."]
}`;

    const result = await runOpenCode(prompt);
    console.log('[evaluate] Result:', JSON.stringify(result).slice(0, 200));
    
    let parsedResult = result;
    if (result.response) {
      try {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsedResult = { error: 'Failed to parse response' };
      }
    }
    
    if (parsedResult.error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: parsedResult.error }));
      return;
    }

    const evalId = generateId();
    const evalStmt = db.prepare(`
      INSERT INTO evaluations (id, session_id, scores, overall_score, grade, strengths, improvements, suggestions, follow_up_questions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    evalStmt.run(
      evalId,
      sessionId,
      JSON.stringify(parsedResult.scores || {}),
      parsedResult.overallScore || 0,
      parsedResult.grade || 'needs-improvement',
      JSON.stringify(parsedResult.strengths || []),
      JSON.stringify(parsedResult.improvements || []),
      JSON.stringify(parsedResult.suggestions || []),
      JSON.stringify(parsedResult.followUpQuestions || [])
    );

    const updateStmt = db.prepare("UPDATE sessions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    updateStmt.run(sessionId);

    res.writeHead(200);
    res.end(JSON.stringify(parsedResult));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(SERVER_PORT, async () => {
  console.log(`API server running on http://localhost:${SERVER_PORT}`);
  console.log(`LLM instructions loaded from: ${LLM_ROOT}`);
  
  try {
    console.log('[init] Starting OpenCode...');
    const opencode = await createOpencode();
    client = opencode.client;
    opencodeServer = opencode.server;
    console.log('[init] OpenCode started at', opencode.server.url);
    
    await loadLlmContext();
    console.log('[init] LLM ready');
  } catch (err) {
    console.log('[init] Failed to start OpenCode:', err.message);
  }
});