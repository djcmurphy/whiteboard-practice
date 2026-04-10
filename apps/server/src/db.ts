import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SessionConfig, ProblemData, Question, Session, SessionListItem, EvaluationResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data.db');
export const db: DatabaseType = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      problem TEXT,
      notes TEXT,
      questions TEXT,
      excalidraw_data TEXT,
      elapsed_seconds INTEGER DEFAULT 0,
      is_paused INTEGER DEFAULT 0,
      status TEXT DEFAULT 'generated',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      scores TEXT,
      overall_score INTEGER,
      grade TEXT,
      strengths TEXT,
      improvements TEXT,
      suggestions TEXT,
      follow_up_questions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS examples (
      id TEXT PRIMARY KEY,
      problem_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      examples TEXT,
      constraints TEXT,
      hints TEXT,
      custom_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function createSession(sessionId: string, config: SessionConfig, problem: ProblemData) {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, config, problem, status)
    VALUES (?, ?, ?, 'generated')
  `);
  stmt.run(sessionId, JSON.stringify(config), JSON.stringify(problem));
}

export function getSession(sessionId: string): Session | null {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const session = stmt.get(sessionId) as any;
  if (!session) return null;
  
  return {
    id: session.id,
    config: JSON.parse(session.config),
    problem: JSON.parse(session.problem),
    notes: session.notes ? JSON.parse(session.notes) : '',
    questions: session.questions ? JSON.parse(session.questions) : [],
    excalidrawData: session.excalidraw_data ? JSON.parse(session.excalidraw_data) : null,
    elapsedSeconds: session.elapsed_seconds || 0,
    isPaused: session.is_paused === 1,
    status: session.status,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

export function updateSession(sessionId: string, data: {
  notes?: string;
  questions?: Question[];
  excalidrawData?: unknown;
  elapsedSeconds?: number;
  isPaused?: boolean;
  status?: string;
}) {
  const current = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
  if (!current) return false;
  
  const stmt = db.prepare(`
    UPDATE sessions 
    SET notes = ?, questions = ?, excalidraw_data = ?, elapsed_seconds = ?, is_paused = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(
    JSON.stringify(data.notes ?? (current.notes ? JSON.parse(current.notes) : [])),
    JSON.stringify(data.questions ?? (current.questions ? JSON.parse(current.questions) : [])),
    JSON.stringify(data.excalidrawData ?? (current.excalidraw_data ? JSON.parse(current.excalidraw_data) : null)),
    data.elapsedSeconds ?? current.elapsed_seconds,
    data.isPaused ? 1 : 0,
    data.status ?? current.status,
    sessionId
  );
  return true;
}

export function listSessions(): SessionListItem[] {
  const stmt = db.prepare('SELECT id, config, problem, status, created_at, updated_at FROM sessions ORDER BY updated_at DESC');
  const sessions = stmt.all() as any[];
  return sessions.map(s => ({
    id: s.id,
    problem: s.problem ? JSON.parse(s.problem) : null,
    status: s.status,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  }));
}

export function saveEvaluation(evaluationId: string, sessionId: string, result: EvaluationResult) {
  const stmt = db.prepare(`
    INSERT INTO evaluations (id, session_id, scores, overall_score, grade, strengths, improvements, suggestions, follow_up_questions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    evaluationId,
    sessionId,
    JSON.stringify(result.scores || {}),
    result.overallScore ?? null,
    result.grade ?? null,
    JSON.stringify(result.strengths || []),
    JSON.stringify(result.improvements || []),
    JSON.stringify(result.suggestions || []),
    JSON.stringify(result.followUpQuestions || [])
  );
}

export function getEvaluation(sessionId: string): EvaluationResult | null {
  const stmt = db.prepare('SELECT * FROM evaluations WHERE session_id = ? ORDER BY created_at DESC LIMIT 1');
  const eval_ = stmt.get(sessionId) as any;
  if (!eval_) return null;
  
  return {
    scores: JSON.parse(eval_.scores || '{}'),
    overallScore: eval_.overall_score,
    grade: eval_.grade,
    strengths: JSON.parse(eval_.strengths || '[]'),
    improvements: JSON.parse(eval_.improvements || '[]'),
    suggestions: JSON.parse(eval_.suggestions || '[]'),
    followUpQuestions: JSON.parse(eval_.follow_up_questions || '[]'),
  };
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

export function createExample(example: {
  id: string;
  problemType: string;
  difficulty: string;
  title: string;
  description: string;
  examples: string[];
  constraints: string[];
  hints: string[];
  customNotes: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO examples (id, problem_type, difficulty, title, description, examples, constraints, hints, custom_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    example.id,
    example.problemType,
    example.difficulty,
    example.title,
    example.description,
    JSON.stringify(example.examples),
    JSON.stringify(example.constraints),
    JSON.stringify(example.hints),
    example.customNotes
  );
}

export function listExamples(): Example[] {
  const stmt = db.prepare('SELECT * FROM examples ORDER BY created_at DESC');
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    id: row.id,
    problemType: row.problem_type,
    difficulty: row.difficulty,
    title: row.title,
    description: row.description,
    examples: JSON.parse(row.examples || '[]'),
    constraints: JSON.parse(row.constraints || '[]'),
    hints: JSON.parse(row.hints || '[]'),
    customNotes: row.custom_notes || '',
    createdAt: row.created_at,
  }));
}

export function deleteExample(id: string): boolean {
  const stmt = db.prepare('DELETE FROM examples WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}