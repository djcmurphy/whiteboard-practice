export interface SessionContext {
  domain: string;
  role: string;
  focusAreas: string[];
}

export interface SessionSpec {
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  constraints: string[];
  timeLimit: number;
}

export interface EvaluationCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface SessionConfig {
  problemType: 'dsa' | 'system-design' | 'frontend' | 'backend' | 'behavioral';
  context: SessionContext;
  spec: SessionSpec;
  evaluation: {
    allowedLanguages: string[];
    priorities: string[];
    criteria: EvaluationCriterion[];
  };
}

export interface SessionState {
  sessionId: string;
  startTime: string;
  elapsedSeconds: number;
  timeLimit: number;
  isPaused: boolean;
  problem: string | null;
  status: 'initialized' | 'in-progress' | 'completed' | 'paused';
}

export interface EvaluationScore {
  score: number;
  maxScore: number;
  feedback: string;
}

export interface EvaluationResult {
  scores: Record<string, EvaluationScore>;
  overallScore: number;
  grade: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  followUpQuestions?: string[];
  timeTaken?: number;
  timestamp: string;
}

export interface Question {
  id: string;
  text: string;
  answer?: string;
  timestamp: number;
}