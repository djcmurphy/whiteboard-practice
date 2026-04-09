import { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { api } from '../lib/api';
import { Excalidraw } from '@excalidraw/excalidraw';

interface SessionPageProps {
  onFinish: () => void;
}

export function SessionPage({ onFinish }: SessionPageProps) {
  const {
    sessionId,
    config,
    problem,
    notes,
    setNotes,
    questions,
    addQuestion,
    excalidrawData,
    setExcalidrawData,
    elapsedSeconds,
    incrementElapsed,
    isPaused,
    setIsPaused,
    setIsLoading,
    setEvaluationResult,
  } = useSessionStore();

  const [newQuestion, setNewQuestion] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [elements, setElements] = useState<any[]>(excalidrawData?.elements || []);

  const timeLimit = config?.spec.timeLimit || 30;
  const remainingSeconds = timeLimit * 60 - elapsedSeconds;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUrgent = remainingSeconds < 300;

  // Timer
  useEffect(() => {
    if (isPaused || remainingSeconds <= 0) {
      if (remainingSeconds <= 0) handleFinish();
      return;
    }
    const interval = setInterval(() => incrementElapsed(), 1000);
    return () => clearInterval(interval);
  }, [isPaused, remainingSeconds]);

  // Save session periodically
  const saveSession = useCallback(async () => {
    if (!sessionId) return;
    await api.saveSession(sessionId, notes, questions, { elements });
  }, [sessionId, notes, questions, elements]);

  useEffect(() => {
    const interval = setInterval(saveSession, 10000);
    return () => clearInterval(interval);
  }, [saveSession]);

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      addQuestion(newQuestion.trim());
      setNewQuestion('');
    }
  };

  const handleFinish = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setIsLoading(true);

    // Save final state first
    await saveSession();

    try {
      const result = await api.evaluate(
        sessionId!,
        notes,
        questions,
        config!,
        problem!
      );

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
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
      setIsLoading(false);
      onFinish();
    }
  };

  const handleElementsChange = (newElements: readonly any[]) => {
    setElements(newElements as any[]);
    setExcalidrawData({ elements: newElements as any[] });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200">
        <div className="flex-1 pr-4">
          <p className="text-xs text-zinc-400">// problem</p>
          <p className="text-sm font-medium text-zinc-800">{problem?.title || 'Untitled'}</p>
          <p className="text-xs text-zinc-500 mt-1">{problem?.description}</p>
        </div>
        
        <div className={`text-2xl font-mono px-4 py-2 ${isUrgent ? 'text-red-600' : 'text-zinc-600'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-4 py-2 text-sm border border-zinc-300 hover:bg-zinc-100"
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
      <div className="flex-1 grid grid-cols-4 gap-4">
        {/* Excalidraw Whiteboard */}
        <div className="col-span-2 border border-zinc-200 bg-white overflow-hidden">
          <Excalidraw
            initialData={excalidrawData || undefined}
            onChange={handleElementsChange}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas: true,
                export: false,
              }
            }}
          />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Notes */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-xs text-zinc-400 mb-2">// notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your approach, algorithm, key decisions..."
              className="flex-1 p-3 border border-zinc-200 text-sm resize-none focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Questions */}
          <div className="flex flex-col max-h-48">
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
            <div className="flex-1 space-y-2 overflow-y-auto">
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

        {/* Prompt Test Panel */}
        <div className="border border-zinc-200 bg-white">
          <div className="p-2 border-b border-zinc-200 bg-zinc-50">
            <span className="text-xs text-zinc-500">// test prompt</span>
          </div>
          <PromptTestPanel />
        </div>
      </div>
    </div>
  );
}

function PromptTestPanel() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponse('...');
    
    try {
      const res = await fetch('http://localhost:3001/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setResponse(data.response || JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse('Error: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Test prompt..."
        className="flex-1 p-2 text-xs resize-none border-none focus:outline-none"
      />
      <div className="p-2 border-t border-zinc-100">
        <button
          onClick={handleTest}
          disabled={isLoading}
          className="w-full py-1 text-xs bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isLoading ? '...' : 'test'}
        </button>
      </div>
      {response && (
        <div className="p-2 border-t border-zinc-100 bg-zinc-50 max-h-32 overflow-auto">
          <pre className="text-xs text-zinc-600 whitespace-pre-wrap">{response.slice(0, 500)}</pre>
        </div>
      )}
    </div>
  );
}