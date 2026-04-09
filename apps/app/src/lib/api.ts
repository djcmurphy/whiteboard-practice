const API_BASE = 'http://localhost:3001/api';

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

export async function checkOpenCodeInstalled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/check`, { method: 'POST' });
    const data = await res.json();
    return data.installed ?? false;
  } catch {
    return false;
  }
}

export async function startServer(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/start`, { method: 'POST' });
    return res.json();
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function evaluate(prompt: string): Promise<EvaluateResponse> {
  try {
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return res.json();
  } catch (error) {
    return { error: String(error) };
  }
}