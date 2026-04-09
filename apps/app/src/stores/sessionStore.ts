import { create } from 'zustand';
import type { SessionConfig, EvaluationResult } from '../types';

interface Question {
  id: string;
  text: string;
  answer?: string;
  timestamp: number;
}

interface ProblemData {
  title: string;
  description: string;
  examples: string[];
  constraints: string[];
  hints: string[];
}

interface SessionStore {
  // Current session
  sessionId: string | null;
  config: SessionConfig | null;
  problem: ProblemData | null;
  notes: string;
  questions: Question[];
  excalidrawData: any;
  elapsedSeconds: number;
  isPaused: boolean;
  
  // UI state
  isLoading: boolean;
  evaluationResult: EvaluationResult | null;
  
  // Actions
  setSession: (sessionId: string, config: SessionConfig, problem: ProblemData) => void;
  setNotes: (notes: string) => void;
  setExcalidrawData: (data: any) => void;
  addQuestion: (text: string) => void;
  setQuestionAnswer: (id: string, answer: string) => void;
  incrementElapsed: () => void;
  setIsPaused: (paused: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setEvaluationResult: (result: EvaluationResult) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  config: null,
  problem: null,
  notes: '',
  questions: [] as Question[],
  excalidrawData: null,
  elapsedSeconds: 0,
  isPaused: false,
  isLoading: false,
  evaluationResult: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  setSession: (sessionId, config, problem) => set({ sessionId, config, problem }),
  
  setNotes: (notes) => set({ notes }),
  
  setExcalidrawData: (data) => set({ excalidrawData: data }),
  
  addQuestion: (text) => set((state) => ({
    questions: [...state.questions, { id: crypto.randomUUID(), text, timestamp: Date.now() }]
  })),
  
  setQuestionAnswer: (id, answer) => set((state) => ({
    questions: state.questions.map(q => q.id === id ? { ...q, answer } : q)
  })),
  
  incrementElapsed: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setEvaluationResult: (result) => set({ evaluationResult: result }),
  
  reset: () => set(initialState)
}));