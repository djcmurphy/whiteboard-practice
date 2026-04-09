import http from 'http';
import { spawn } from 'child_process';
import { exec as execSync } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execSync);

const OPENCODE_PORT = 4096;
const OPENCODE_HOST = 'localhost';
const SERVER_PORT = 3001;

let serverRunning = false;

async function checkOpenCode() {
  try {
    await exec('opencode --version');
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  if (serverRunning) return;
  
  const proc = spawn('opencode', ['serve', '--port', String(OPENCODE_PORT), '--hostname', OPENCODE_HOST], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();
  
  await new Promise(r => setTimeout(r, 2000));
  serverRunning = true;
  console.log(`OpenCode server started on ${OPENCODE_HOST}:${OPENCODE_PORT}`);
}

async function runOpenCode(prompt) {
  const args = ['run', '--attach', `http://${OPENCODE_HOST}:${OPENCODE_PORT}`, '--format', 'json', '--', prompt];
  
  const { stdout } = await exec(`opencode ${args.join(' ')}`, { timeout: 120000 });
  
  try {
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(stdout);
  } catch {
    return { error: 'Failed to parse response', raw: stdout };
  }
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
  
  if (url.pathname === '/api/check' && req.method === 'POST') {
    const installed = await checkOpenCode();
    res.writeHead(200);
    res.end(JSON.stringify({ installed }));
    return;
  }
  
  if (url.pathname === '/api/start' && req.method === 'POST') {
    await startServer();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
    return;
  }
  
  if (url.pathname === '/api/evaluate' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const { prompt } = JSON.parse(body);
    if (!prompt) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'No prompt' }));
      return;
    }
    
    const result = await runOpenCode(prompt);
    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  }
  
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(SERVER_PORT, () => {
  console.log(`API server running on http://localhost:${SERVER_PORT}`);
});