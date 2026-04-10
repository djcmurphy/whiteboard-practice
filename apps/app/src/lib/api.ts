import type { SessionConfig, Question } from '../types';

const API_BASE = 'http://localhost:3001/api';

export type { SessionConfig };

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
  questions: Question[];
  excalidrawData: any;
  status: 'generated' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  elapsedSeconds?: number;
  isPaused?: boolean;
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

export interface LlmModel {
  id: string;
  name: string;
  provider: string;
}

export interface LlmStatus {
  connected: boolean;
  currentModel: string;
  availableModels: LlmModel[];
  serverUrl: string | null;
}

export interface Example {
  id: string;
  problemType: string;
  difficulty: string;
  title: string;
  description: string;
  examples: string[];
  constraints: string[];
  hints: string[];
  customNotes: string;
  createdAt: string;
}

export interface GenerateRequest {
  config: SessionConfig;
  count?: number;
  customNotes?: string;
}

export interface GenerateResponse {
  examples: Example[];
}

async function request<T>(path: string, method: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  checkOpenCode: () => request<{ installed: boolean }>('/check', 'POST'),
  
  startServer: () => request<{ success: boolean }>('/start', 'POST'),
  
  generateExamples: (config: SessionConfig, count: number = 3, customNotes: string = '') => 
    request<GenerateResponse>('/generate', 'POST', { config, count, customNotes }),
  
  getExamples: () => request<{ examples: Example[] }>('/examples', 'GET'),
  
  deleteExample: (id: string) => request<{ success: boolean }>(`/examples/${id}`, 'DELETE'),
  
  startFromExample: (id: string) => request<{ sessionId: string; problem: ProblemData; config: SessionConfig }>(`/examples/${id}/start`, 'POST'),
  
  getSessions: () => request<SessionListItem[]>('/sessions', 'GET'),
  
  getSession: (id: string) => request<Session>(`/sessions/${id}`, 'GET'),
  
  saveSession: (sessionId: string, notes: string, questions: any[], excalidrawData: any, elapsedSeconds: number = 0, isPaused: boolean = false) => 
    request<{ success: boolean }>('/sessions', 'PUT', { sessionId, notes, questions, excalidrawData, elapsedSeconds, isPaused }),
  
  evaluate: (sessionId: string, notes: string, questions: any[], config: SessionConfig, problem: ProblemData) => 
    request<EvaluateResponse>('/evaluate', 'POST', { sessionId, notes, questions, config, problem }),
    
  getLlmStatus: () => request<LlmStatus>('/llm', 'GET'),
  
  setLlmModel: (modelId: string) => request<LlmStatus>('/llm', 'POST', { modelId }),
};

export const checkOpenCodeInstalled = () => api.checkOpenCode().then(r => r.installed);
export const startServer = () => api.startServer();