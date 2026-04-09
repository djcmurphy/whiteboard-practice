import { useState, useRef, useEffect, useMemo } from "react";
import { useSessionStore } from "../stores/sessionStore";
import { api } from "../lib/api";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

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
    elapsedSeconds,
    incrementElapsed,
    isPaused,
    setIsPaused,
    setIsLoading,
    setEvaluationResult,
  } = useSessionStore();

  const [newQuestion, setNewQuestion] = useState("");
  const excalidrawAPIRef = useRef<any>(null);
  const isFinished = useRef(false);
  const lastSaveRef = useRef(0);

  const timeLimit = config?.spec.timeLimit || 30;
  const remaining = timeLimit * 60 - elapsedSeconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining < 300;

  useEffect(() => {
    if (isPaused || remaining <= 0 || isFinished.current) return;
    const timer = setInterval(incrementElapsed, 1000);
    return () => clearInterval(timer);
  }, [isPaused, remaining]);

  useEffect(() => {
    if (!sessionId || isFinished.current) return;
    const now = Date.now();
    if (now - lastSaveRef.current > 10000) {
      lastSaveRef.current = now;
      api.saveSession(sessionId, notes, questions, { 
        elements: excalidrawAPIRef.current?.getSceneElements() || [] 
      });
    }
  }, [sessionId, notes, questions]);

  useEffect(() => {
    if (remaining <= 0 && !isFinished.current) {
      isFinished.current = true;
      finish();
    }
  }, [remaining]);

  const finish = async () => {
    if (isFinished.current) return;
    isFinished.current = true;
    setIsLoading(true);
    if (sessionId && excalidrawAPIRef.current) {
      await api.saveSession(sessionId, notes, questions, { 
        elements: excalidrawAPIRef.current.getSceneElements() 
      });
    }
    try {
      const result = await api.evaluate(
        sessionId!,
        notes,
        questions,
        config!,
        problem!,
      );
      if (result.overallScore !== undefined) {
        setEvaluationResult({
          scores: result.scores || {},
          overallScore: result.overallScore,
          grade: result.grade || "needs-improvement",
          strengths: result.strengths || [],
          improvements: result.improvements || [],
          suggestions: result.suggestions || [],
          followUpQuestions: result.followUpQuestions,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
    onFinish();
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      addQuestion(newQuestion.trim());
      setNewQuestion("");
    }
  };

  const excalidrawOptions = useMemo(() => ({
    canvasActions: {
      changeViewBackgroundColor: false,
      clearCanvas: true,
    },
  }), []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200">
        <div className="flex-1 pr-4">
          <p className="text-xs text-zinc-400">// problem</p>
          <p className="text-sm font-medium text-zinc-800">
            {problem?.title || "Untitled"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{problem?.description}</p>
        </div>

        <div
          className={`text-2xl font-mono px-4 py-2 ${urgent ? "text-red-600" : "text-zinc-600"}`}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-4 py-2 text-sm border border-zinc-300 hover:bg-zinc-100"
          >
            {isPaused ? "resume" : "pause"}
          </button>
          <button
            onClick={finish}
            className="px-4 py-2 text-sm bg-zinc-900 text-white hover:bg-zinc-700"
          >
            finish_
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-4" style={{ minHeight: 0 }}>
        <div className="col-span-2 border border-zinc-200 bg-white overflow-hidden" style={{ height: '100%', minHeight: '400px' }}>
          <div style={{ height: '100%' }}>
            <Excalidraw
              initialData={excalidrawData || undefined}
              excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
              UIOptions={excalidrawOptions}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-xs text-zinc-400 mb-2">// notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your approach, algorithm, key decisions..."
              className="flex-1 p-3 border border-zinc-200 text-sm resize-none focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="flex flex-col max-h-48">
            <label className="text-xs text-zinc-400 mb-2">// questions</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
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
                <div
                  key={q.id}
                  className="p-2 bg-zinc-50 border border-zinc-100 text-sm"
                >
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