import { spawn } from 'bun';
import { promisify } from 'util';
import { exec as execSync } from 'child_process';

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
  
  const proc = spawn(['opencode', 'serve', '--port', String(OPENCODE_PORT), '--hostname', OPENCODE_HOST], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();
  
  await new Promise(r => setTimeout(r, 2000));
  serverRunning = true;
  console.log(`OpenCode server started on ${OPENCODE_HOST}:${OPENCODE_PORT}`);
}

async function runOpenCode(prompt: string) {
  const args = ['run', '--attach', `http://${OPENCODE_HOST}:${OPENCODE_PORT}`, '--format', 'json', '--', prompt];
  
  const { stdout } = await exec(`opencode ${args.join(' ')}`, { timeout: 120000 });
  
  try {
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(stdout);
  } catch {
    return { error: 'Failed to parse response', raw: stdout };
  }
}

const server = Bun.serve({
  port: SERVER_PORT,
  
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/api/check' && req.method === 'POST') {
      const installed = await checkOpenCode();
      return Response.json({ installed });
    }
    
    if (url.pathname === '/api/start' && req.method === 'POST') {
      await startServer();
      return Response.json({ success: true });
    }
    
    if (url.pathname === '/api/evaluate' && req.method === 'POST') {
      const { prompt } = await req.json();
      if (!prompt) return Response.json({ error: 'No prompt' }, { status: 400 });
      
      const result = await runOpenCode(prompt);
      return Response.json(result);
    }
    
    if (url.pathname === '/health' && req.method === 'GET') {
      return Response.json({ status: 'ok' });
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
});

console.log(`API server running on http://localhost:${server.port}`);