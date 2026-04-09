import http from 'http';
import { spawn } from 'child_process';
import { exec as execSync } from 'child_process';
import { promisify } from 'util';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exec = promisify(execSync);

const OPENCODE_PORT = 4096;
const OPENCODE_HOST = 'localhost';
const SERVER_PORT = 3001;

// Database setup
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

let opencodeServerRunning = false;

async function checkOpenCode() {
  try {
    await exec('opencode --version');
    return true;
  } catch {
    return false;
  }
}

async function startOpenCodeServer() {
  if (opencodeServerRunning) return;
  
  const proc = spawn('opencode', ['serve', '--port', String(OPENCODE_PORT), '--hostname', OPENCODE_HOST], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();
  
  await new Promise(r => setTimeout(r, 2000));
  opencodeServerRunning = true;
  console.log(`OpenCode server started on ${OPENCODE_HOST}:${OPENCODE_PORT}`);
}

async function runOpenCode(prompt) {
  const args = ['run', '--attach', `http://${OPENCODE_HOST}:${OPENCODE_PORT}`, '--format', 'json', '--', prompt];
  
  const { stdout } = await exec(`opencode ${args.join(' ')}`, { timeout: 180000 });
  
  try {
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(stdout);
  } catch {
    return { error: 'Failed to parse response', raw: stdout };
  }
}

function generateId() {
  return crypto.randomUUID();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${SERVER_PORT}`);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
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

  // Check OpenCode installed
  if (url.pathname === '/api/check' && req.method === 'POST') {
    const installed = await checkOpenCode();
    res.writeHead(200);
    res.end(JSON.stringify({ installed }));
    return;
  }

  // Start OpenCode server
  if (url.pathname === '/api/start' && req.method === 'POST') {
    await startOpenCodeServer();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Generate problem from config
  if (url.pathname === '/api/generate' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const config = JSON.parse(body);
    
    const prompt = `Generate a ${config.spec.difficulty} ${config.problemType} problem for a ${config.context.role} role in the ${config.context.domain} domain.

Respond ONLY with valid JSON in this format:
{
  "title": "problem title",
  "description": "detailed problem description",
  "examples": ["example 1", "example 2"],
  "constraints": ["constraint 1", "constraint 2"],
  "hints": ["hint 1", "hint 2"]
}`;

    const result = await runOpenCode(prompt);
    
    if (result.error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    // Save to database
    const sessionId = generateId();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, config, problem, status)
      VALUES (?, ?, ?, 'generated')
    `);
    
    stmt.run(sessionId, JSON.stringify(config), JSON.stringify(result));
    
    res.writeHead(200);
    res.end(JSON.stringify({ 
      sessionId, 
      problem: result,
      config 
    }));
    return;
  }

  // Save session (notes, questions, excalidraw data)
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

  // Get session by ID
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

  // List all sessions
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

  // Evaluate session
  if (url.pathname === '/api/evaluate' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const { sessionId, notes, questions, config, problem } = JSON.parse(body);
    
    const prompt = `You are evaluating a ${config.spec.difficulty} ${config.problemType} problem in the ${config.context.domain} domain for a ${config.context.role} role.

## Problem
${problem?.title || 'N/A'}
${problem?.description || ''}

## Candidate's Notes
${notes || 'No notes provided'}

## Questions from Candidate
${questions?.map(q => `- ${q.text}`).join('\n') || 'None'}

## Evaluation Criteria
${config.evaluation.criteria.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Your task: Evaluate the candidate's solution. Respond ONLY with valid JSON:
{
  "scores": { "criterion-name": { "score": 1-5, "maxScore": 5, "feedback": "..." } },
  "overallScore": 0-100,
  "grade": "excellent|good|needs-improvement|poor",
  "strengths": ["..."],
  "improvements": ["..."],
  "suggestions": ["..."],
  "followUpQuestions": ["..."]
}`;

    const result = await runOpenCode(prompt);
    
    if (result.error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    // Save evaluation
    const evalId = generateId();
    const evalStmt = db.prepare(`
      INSERT INTO evaluations (id, session_id, scores, overall_score, grade, strengths, improvements, suggestions, follow_up_questions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    evalStmt.run(
      evalId,
      sessionId,
      JSON.stringify(result.scores),
      result.overallScore,
      result.grade,
      JSON.stringify(result.strengths),
      JSON.stringify(result.improvements),
      JSON.stringify(result.suggestions),
      JSON.stringify(result.followUpQuestions || [])
    );

    // Update session status
    const updateStmt = db.prepare("UPDATE sessions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    updateStmt.run(sessionId);

    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(SERVER_PORT, () => {
  console.log(`API server running on http://localhost:${SERVER_PORT}`);
});