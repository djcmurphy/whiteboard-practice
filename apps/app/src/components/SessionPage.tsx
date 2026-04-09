import { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { evaluate } from '../lib/api';

interface SessionPageProps {
  onFinish: () => void;
}

export function SessionPage({ onFinish }: SessionPageProps) {
  const { 
    config, 
    problem, 
    notes, 
    setNotes, 
    questions, 
    addQuestion,
    elapsedSeconds,
    incrementElapsed,
    isPaused,
    setIsPaused,
    setIsLoading,
    setEvaluationResult,
  } = useSessionStore();

  const [newQuestion, setNewQuestion] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const timeLimit = config?.spec.timeLimit || 30;
  const remainingSeconds = timeLimit * 60 - elapsedSeconds;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUrgent = remainingSeconds < 300; // < 5 minutes

  useEffect(() => {
    if (isPaused) return;
    if (remainingSeconds <= 0) {
      handleFinish();
      return;
    }
    const interval = setInterval(() => incrementElapsed(), 1000);
    return () => clearInterval(interval);
  }, [isPaused, remainingSeconds]);

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      addQuestion(newQuestion.trim());
      setNewQuestion('');
    }
  };

  const handleFinish = async () => {
    setIsEvaluating(true);
    setIsLoading(true);

    const prompt = buildPrompt();
    const result = await evaluate(prompt);

    setIsEvaluating(false);
    setIsLoading(false);

    if (result.overallScore !== undefined) {
      setEvaluationResult({
        scores: result.scores || {},
        overallScore: result.overallScore,
        grade: result.grade || 'needs-improvement',
        strengths: result.strengths || [],
        improvements: result.improvements || [],
        suggestions: result.suggestions || [],
        followUpQuestions: result.followUpQuestions,
        timestamp: new Date().toISOString(),
      });
    }

    onFinish();
  };

  const buildPrompt = () => {
    if (!config) return '';
    
    return `You are evaluating a ${config.spec.difficulty} ${config.problemType} problem in the ${config.context.domain} domain for a ${config.context.role} role.

## Problem
${problem}

## Candidate's Notes
${notes || 'No notes provided'}

## Questions from Candidate
${questions.map(q => `- ${q.text}`).join('\n') || 'None'}

## Evaluation Criteria
${config.evaluation.criteria.map(c => `- ${c.name}: ${c.description}`).join('\n')}

## Your Task
Evaluate the candidate's solution. Respond ONLY with valid JSON in this format:
{
  "scores": { "criterion-name": { "score": 1-5, "maxScore": 5, "feedback": "..." } },
  "overallScore": 0-100,
  "grade": "excellent|good|needs-improvement|poor",
  "strengths": ["..."],
  "improvements": ["..."],
  "suggestions": ["..."]
}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200">
        <div className="flex-1">
          <p className="text-xs text-zinc-400">// problem</p>
          <p className="text-sm font-medium text-zinc-800">{problem}</p>
        </div>
        
        <div className={`text-2xl font-mono px-4 py-2 ${isUrgent ? 'text-red-600' : 'text-zinc-600'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-4 py-2 text-sm border border-zinc-300 hover:bg-zinc-100 transition-colors"
          >
            {isPaused ? 'resume' : 'pause'}
          </button>
          <button
            onClick={handleFinish}
            disabled={isEvaluating}
            className="px-4 py-2 text-sm bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isEvaluating ? 'evaluating...' : 'finish_'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-3 gap-4">
        {/* Whiteboard */}
        <div className="col-span-2 border border-zinc-200 bg-white">
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
            {/* Excalidraw will go here */}
            whiteboard-canvas
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Notes */}
          <div className="flex-1 flex flex-col">
            <label className="text-xs text-zinc-400 mb-2">// notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your approach, algorithm, key decisions..."
              className="flex-1 p-3 border border-zinc-200 text-sm resize-none focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Questions */}
          <div className="flex flex-col">
            <label className="text-xs text-zinc-400 mb-2">// questions</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                placeholder="Ask a question..."
                className="flex-1 p-2 border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
              />
              <button
                onClick={handleAddQuestion}
                className="px-3 text-sm bg-zinc-100 hover:bg-zinc-200 border border-zinc-200"
              >
                send
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-32">
              {questions.map((q) => (
                <div key={q.id} className="p-2 bg-zinc-50 border border-zinc-100 text-sm">
                  <span className="text-zinc-500">Q:</span> {q.text}
                  {q.answer && (
                    <div className="mt-1 pl-2 text-zinc-600">
                      <span className="text-zinc-400">A:</span> {q.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}