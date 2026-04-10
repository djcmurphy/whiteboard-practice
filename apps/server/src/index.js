import http from 'http';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createOpencode } from "@opencode-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_PORT = 3001;
const LLM_ROOT = path.resolve(__dirname, '../../../llm');

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
  const fullstack = readFile(path.join(LLM_ROOT, 'instructions/fullstack.md'));
  const mobile = readFile(path.join(LLM_ROOT, 'instructions/mobile.md'));
  const devops = readFile(path.join(LLM_ROOT, 'instructions/devops.md'));
  
  return `${base}

--- DSA TYPE ---
${dsa}

--- SYSTEM DESIGN TYPE ---
${systemDesign}

--- FRONTEND TYPE ---
${frontend}

--- BACKEND TYPE ---
${backend}

--- FULLSTACK TYPE ---
${fullstack}

--- MOBILE TYPE ---
${mobile}

--- DEVOPS TYPE ---
${devops}
`;
}

async function runOpenCode(prompt, format = null) {
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
    
    const requestBody = {
      parts: [{ type: 'text', text: prompt }]
    };
    if (format) {
      requestBody.format = format;
    }
    
    const result = await client.session.prompt({
      path: { id: sessionId },
      body: requestBody
    });
    
    console.log('[runOpenCode] Result keys:', Object.keys(result));
    
    if (result.error) {
      console.log('[runOpenCode] Error response:', result.error);
      return { error: result.error };
    }
    
    if (!result.data) {
      console.log('[runOpenCode] No data in result');
      return { error: 'No response from LLM' };
    }
    
    console.log('[runOpenCode] Result data keys:', Object.keys(result.data));
    console.log('[runOpenCode] Result info keys:', result.data?.info ? Object.keys(result.data.info) : 'no info');
    console.log('[runOpenCode] Result data:', result.data ? JSON.stringify(result.data).slice(0, 500) : 'no data');
    
    // If structured output was requested, return it directly
    console.log('[runOpenCode] Structured:', result.data?.info?.structured ? JSON.stringify(result.data.info.structured).slice(0, 300) : 'no structured');
    if (format && result.data?.info?.structured) {
      return { response: JSON.stringify(result.data.info.structured) };
    }
    
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
    const { prompt, problem } = JSON.parse(body);
    
    const problemDetails = [];
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

    const result = await runOpenCode(`${systemPrompt}\n\nCandidate asks: ${prompt}`);
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

    const prompt = `Generate a ${config.spec.difficulty} ${config.problemType} problem suitable for ${config.context.domain} domain.

Respond ONLY with valid JSON matching this schema:
${JSON.stringify(ProblemJsonSchema, null, 2)}`;

    const result = await runOpenCode(prompt, { type: 'json_schema', schema: ProblemJsonSchema });
    console.log('[generate] Result:', result.error ? result.error : (result.response ? result.response.slice(0, 500) : 'no response'));
    
    let parsedResult = result;
    if (result.response) {
      try {
        parsedResult = JSON.parse(result.response);
      } catch {
        parsedResult = { title: result.response.substring(0, 50), description: result.response };
      }
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
    console.log('[evaluate] Result:', result.error ? result.error : (result.response ? result.response.slice(0, 200) : 'no response'));
    
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