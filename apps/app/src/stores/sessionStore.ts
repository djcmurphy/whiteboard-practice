import { create } from 'zustand';
import type { SessionConfig, EvaluationResult, Question } from '../types';

interface SessionStore {
  config: SessionConfig | null;
  problem: string;
  notes: string;
  questions: Question[];
  elapsedSeconds: number;
  isPaused: boolean;
  isLoading: boolean;
  evaluationResult: EvaluationResult | null;
  
  setConfig: (config: SessionConfig) => void;
  setProblem: (problem: string) => void;
  setNotes: (notes: string) => void;
  addQuestion: (text: string) => void;
  setQuestionAnswer: (id: string, answer: string) => void;
  setElapsedSeconds: (seconds: number) => void;
  incrementElapsed: () => void;
  setIsPaused: (paused: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setEvaluationResult: (result: EvaluationResult) => void;
  reset: () => void;
}

const initialState = {
  config: null,
  problem: '',
  notes: '',
  questions: [] as Question[],
  elapsedSeconds: 0,
  isPaused: false,
  isLoading: false,
  evaluationResult: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  setConfig: (config) => set({ config }),
  setProblem: (problem) => set({ problem }),
  setNotes: (notes) => set({ notes }),
  
  addQuestion: (text) => set((state) => ({
    questions: [
      ...state.questions,
      { id: crypto.randomUUID(), text, timestamp: Date.now() }
    ]
  })),
  
  setQuestionAnswer: (id, answer) => set((state) => ({
    questions: state.questions.map(q => 
      q.id === id ? { ...q, answer } : q
    )
  })),
  
  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),
  incrementElapsed: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setEvaluationResult: (result) => set({ evaluationResult: result }),
  
  reset: () => set(initialState)
}));