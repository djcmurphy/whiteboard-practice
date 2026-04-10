export interface SessionConfig {
  problemType: 'dsa' | 'system-design' | 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'devops';
  context: {
    domain: string;
    focusAreas: string[];
  };
  spec: {
    difficulty: 'easy' | 'medium' | 'hard';
    topics: string[];
    constraints: string[];
    timeLimit: number;
  };
  evaluation: {
    allowedLanguages: string[];
    priorities: string[];
    criteria: { name: string; weight: number; description: string }[];
  };
}

export interface ProblemData {
  title: string;
  description: string;
  examples: string[];
  constraints: string[];
  hints: string[];
}

export interface Question {
  id: string;
  text: string;
  answer?: string;
  timestamp: number;
  parentId?: string;
}

export interface Session {
  id: string;
  config: SessionConfig;
  problem: ProblemData;
  notes: string;
  questions: Question[];
  excalidrawData: unknown;
  elapsedSeconds: number;
  isPaused: boolean;
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

export interface EvaluationResult {
  scores?: Record<string, { score: number; maxScore: number; feedback: string }>;
  overallScore?: number;
  grade?: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  strengths?: string[];
  improvements?: string[];
  suggestions?: string[];
  followUpQuestions?: string[];
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

export const FREE_MODELS: LlmModel[] = [
  { id: 'opencode/gpt-5-nano', name: 'GPT 5 Nano', provider: 'OpenCode Zen' },
  { id: 'opencode/big-pickle', name: 'Big Pickle', provider: 'OpenCode Zen' },
  { id: 'opencode/glm-4.7-free', name: 'GLM 4.7 Free', provider: 'OpenCode Zen' },
  { id: 'opencode/minimax-m2.1-free', name: 'MiniMax M2.1 Free', provider: 'OpenCode Zen' },
  { id: 'opencode/kimi-k2.5-free', name: 'Kimi K2.5 Free', provider: 'OpenCode Zen' },
];

export const PROBLEM_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' as const, description: 'Problem title' },
    description: { type: 'string' as const, description: 'Detailed problem description' },
    examples: { type: 'array' as const, items: { type: 'string' as const }, description: 'Examples of the problem' },
    constraints: { type: 'array' as const, items: { type: 'string' as const }, description: 'Problem constraints' },
    hints: { type: 'array' as const, items: { type: 'string' as const }, description: 'Hints for solving' }
  },
  required: ['title', 'description', 'examples', 'constraints']
};