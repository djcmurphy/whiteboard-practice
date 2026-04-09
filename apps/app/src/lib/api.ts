const API_BASE = 'http://localhost:3001/api';

export interface SessionConfig {
  problemType: string;
  context: { domain: string; focusAreas: string[] };
  spec: { difficulty: string; topics: string[]; constraints: string[]; timeLimit: number };
  evaluation: { allowedLanguages: string[]; priorities: string[]; criteria: { name: string; weight: number; description: string }[] };
}

export interface ProblemData {
  title: string;
  description: string;
  examples: string[];
  constraints: string[];
  hints: string[];
}

export interface Session {
  id: string;
  config: SessionConfig;
  problem: ProblemData;
  notes: string;
  questions: { id: string; text: string; answer?: string }[];
  excalidrawData: any;
  status: 'generated' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface SessionListItem {
  id: string;
  problem: ProblemData | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluateResponse {
  scores?: Record<string, { score: number; maxScore: number; feedback: string }>;
  overallScore?: number;
  grade?: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  strengths?: string[];
  improvements?: string[];
  suggestions?: string[];
  followUpQuestions?: string[];
  error?: string;
}

async function request<T>(path: string, method: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

export const api = {
  checkOpenCode: () => request<{ installed: boolean }>('/check', 'POST'),
  
  startServer: () => request<{ success: boolean }>('/start', 'POST'),
  
  generateProblem: (config: SessionConfig) => request<{ sessionId: string; problem: ProblemData; config: SessionConfig }>('/generate', 'POST', config),
  
  getSessions: () => request<SessionListItem[]>('/sessions', 'GET'),
  
  getSession: (id: string) => request<Session>(`/sessions/${id}`, 'GET'),
  
  saveSession: (sessionId: string, notes: string, questions: any[], excalidrawData: any) => 
    request<{ success: boolean }>('/sessions', 'PUT', { sessionId, notes, questions, excalidrawData }),
  
  evaluate: (sessionId: string, notes: string, questions: any[], config: SessionConfig, problem: ProblemData) => 
    request<EvaluateResponse>('/evaluate', 'POST', { sessionId, notes, questions, config, problem }),
};

export const checkOpenCodeInstalled = () => api.checkOpenCode().then(r => r.installed);
export const startServer = () => api.startServer();