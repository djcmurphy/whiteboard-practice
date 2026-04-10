import { create } from 'zustand';
import type { SessionConfig, EvaluationResult } from '../types';

interface Question {
  id: string;
  text: string;
  answer?: string;
  timestamp: number;
  parentId?: string;
}

interface ProblemData {
  title: string;
  description: string;
  examples: string[];
  constraints: string[];
  hints: string[];
}

interface SessionState {
  sessionId: string | null;
  config: SessionConfig | null;
  problem: ProblemData | null;
  notes: string;
  privateNotes: string;
  questions: Question[];
  excalidrawData: any;
  elapsedSeconds: number;
  isPaused: boolean;
  showExamples: boolean;
  showConstraints: boolean;
  evaluationResult: EvaluationResult | null;
}

interface SessionActions {
  startSession: (sessionId: string, config: SessionConfig, problem: ProblemData) => void;
  loadSession: (sessionData: {
    sessionId: string;
    config: SessionConfig;
    problem: ProblemData;
    notes: string;
    privateNotes: string;
    questions: Question[];
    excalidrawData: any;
    elapsedSeconds: number;
    isPaused: boolean;
    showExamples: boolean;
    showConstraints: boolean;
  }) => void;
  updateSession: (updates: Partial<Pick<SessionState, 'notes' | 'privateNotes' | 'excalidrawData'>>) => void;
  addQuestion: (text: string) => string;
  updateQuestion: (id: string, updates: Partial<Pick<Question, 'text' | 'answer' | 'parentId'>>) => void;
  setTimer: (elapsed?: number, isPaused?: boolean) => void;
  setShowOptions: (showExamples: boolean, showConstraints: boolean) => void;
  complete: (result: EvaluationResult) => void;
  reset: () => void;
}

const initialState: SessionState = {
  sessionId: null,
  config: null,
  problem: null,
  notes: '',
  privateNotes: '',
  questions: [],
  excalidrawData: null,
  elapsedSeconds: 0,
  isPaused: false,
  showExamples: false,
  showConstraints: false,
  evaluationResult: null,
};

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  ...initialState,

  startSession: (sessionId, config, problem) => {
    localStorage.setItem('lastSessionId', sessionId);
    set({
      sessionId,
      config,
      problem,
      elapsedSeconds: 0,
      isPaused: false,
      notes: '',
      privateNotes: '',
      questions: [],
      excalidrawData: null,
      evaluationResult: null,
    });
  },

  loadSession: (sessionData) => {
    localStorage.setItem('lastSessionId', sessionData.sessionId);
    set({
      ...sessionData,
      evaluationResult: null,
    });
  },

  updateSession: (updates) => set((state) => ({ ...state, ...updates })),

  addQuestion: (text) => {
    const id = crypto.randomUUID();
    const question = { id, text, timestamp: Date.now() };
    set((state) => ({ questions: [...state.questions, question] }));
    return id;
  },

  updateQuestion: (id, updates) => set((state) => ({
    questions: state.questions.map(q => q.id === id ? { ...q, ...updates } : q)
  })),

  setTimer: (elapsed, isPaused) => set((state) => ({
    elapsedSeconds: elapsed ?? state.elapsedSeconds,
    isPaused: isPaused ?? state.isPaused,
  })),

  setShowOptions: (showExamples, showConstraints) => set({ showExamples, showConstraints }),

  complete: (result) => set({ evaluationResult: result }),

  reset: () => set(initialState),
}));