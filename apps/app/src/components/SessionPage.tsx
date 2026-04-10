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
    privateNotes,
    questions,
    excalidrawData,
    elapsedSeconds,
    isPaused,
    showExamples,
    showConstraints,
    updateSession,
    addQuestion,
    updateQuestion,
    setTimer,
    complete,
  } = useSessionStore();

  const [llmQuestion, setLlmQuestion] = useState("");
  const [llmLoadingId, setLlmLoadingId] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const isFinished = useRef(false);
  const lastSaveRef = useRef(0);

  const timeLimit = config?.spec.timeLimit || 30;
  const remaining = timeLimit * 60 - elapsedSeconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining < 300;

  // Timer - also handles finishing when time runs out
  useEffect(() => {
    if (isPaused || remaining <= 0 || isFinished.current) return;

    if (remaining <= 1) {
      finish();
      return;
    }

    const timer = setInterval(() => {
      setTimer(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, remaining]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!sessionId || isFinished.current) return;
    const now = Date.now();
    if (now - lastSaveRef.current > 10000) {
      lastSaveRef.current = now;
      api.saveSession(
        sessionId,
        notes,
        questions,
        { elements: excalidrawAPIRef.current?.getSceneElements() || [] },
        elapsedSeconds,
        isPaused,
      );
    }
  }, [sessionId, notes, questions, elapsedSeconds, isPaused]);

  const finish = async () => {
    if (isFinished.current) return;
    isFinished.current = true;

    if (sessionId && excalidrawAPIRef.current) {
      await api.saveSession(
        sessionId,
        notes,
        questions,
        { elements: excalidrawAPIRef.current.getSceneElements() },
        elapsedSeconds,
        isPaused,
      );
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
        complete({
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
    onFinish();
  };

  const handleAskLlm = async () => {
    if (!llmQuestion.trim()) return;
    const questionText = llmQuestion;

    // Build conversation context for the LLM
    let contextInfo = "";
    if (replyToId) {
      const parentQ = questions.find((q) => q.id === replyToId);
      if (parentQ) {
        contextInfo = `\n\nThis is a follow-up question to: "${parentQ.text}"\nPrevious answer: "${parentQ.answer || "N/A"}"`;
      }
    }

    const fullPrompt = questionText + contextInfo;
    const tempId = addQuestion(questionText);

    if (replyToId) {
      updateQuestion(tempId, { parentId: replyToId });
    }

    setLlmLoadingId(tempId);
    setLlmQuestion("");
    setReplyToId(null);

    try {
      const res = await fetch("http://localhost:3001/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, problem }),
      });
      const data = await res.json();
      const answer = data.response || data.error || "No response";
      updateQuestion(tempId, { answer });
    } catch (e) {
      updateQuestion(tempId, { answer: "Error: " + String(e) });
    }
    setLlmLoadingId(null);
  };

  const excalidrawOptions = useMemo(
    () => ({
      canvasActions: {
        changeViewBackgroundColor: false,
        clearCanvas: true,
      },
    }),
    [],
  );

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200">
        <div className="flex-1 pr-4">
          <p className="text-xs text-zinc-400">// problem</p>
          <p className="text-base font-medium text-zinc-800">
            {problem?.title || "Untitled"}
          </p>
        </div>

        <div
          className={`text-2xl font-mono px-4 py-2 ${urgent ? "text-red-600" : "text-zinc-600"}`}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimer(undefined, !isPaused)}
            className="px-4 py-2 text-sm border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
          >
            {isPaused ? "resume" : "pause"}
          </button>
          <button
            onClick={finish}
            className="px-4 py-2 text-sm bg-zinc-900 text-white hover:bg-zinc-700 cursor-pointer"
          >
            finish_
          </button>
        </div>
      </div>

      <div
        className="flex-1 grid grid-cols-5 gap-4 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        <div className="col-span-1 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-zinc-50 border border-zinc-200 p-4">
            <p className="text-xs text-zinc-400 mb-2">// description</p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">
              {problem?.description || "No description"}
            </p>
          </div>

          {showExamples && problem?.examples && problem.examples.length > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 mb-2">// examples</p>
              <div className="text-sm text-zinc-700 space-y-2">
                {problem.examples.map((ex, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {ex}
                  </p>
                ))}
              </div>
            </div>
          )}

          {showConstraints &&
            problem?.constraints &&
            problem.constraints.length > 0 && (
              <div className="bg-zinc-50 border border-zinc-200 p-4">
                <p className="text-xs text-zinc-400 mb-2">// constraints</p>
                <ul className="text-sm text-zinc-700 list-disc list-inside">
                  {problem.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

          <div className="border border-zinc-200 bg-white flex flex-col">
            <div className="p-2 border-b border-zinc-100 shrink-0">
              <span className="text-xs text-zinc-400">// ask llm</span>
            </div>
            <div className="p-2">
              <textarea
                value={llmQuestion}
                onChange={(e) => setLlmQuestion(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.preventDefault(), handleAskLlm())
                }
                placeholder={
                  replyToId ? "Ask a follow-up..." : "Ask about the problem..."
                }
                className="w-full p-2 text-xs border border-zinc-200 resize-none focus:outline-none focus:border-zinc-400"
                rows={2}
              />
              <div className="flex gap-1 mt-1">
                <button
                  onClick={handleAskLlm}
                  disabled={llmLoadingId !== null || !llmQuestion.trim()}
                  className="flex-1 py-1 text-xs bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                >
                  {llmLoadingId ? "..." : "ask"}
                </button>
                {replyToId && (
                  <button
                    onClick={() => setReplyToId(null)}
                    className="px-2 py-1 text-xs bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 cursor-pointer"
                  >
                    cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border border-zinc-200 bg-white flex flex-col min-h-[100px]">
            <div className="p-2 border-b border-zinc-100 shrink-0">
              <span className="text-xs text-zinc-400">// my questions</span>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {questions.length > 0 && (
                <div className="space-y-2">
                  {questions
                    .filter((q) => !q.parentId)
                    .map((q) => (
                      <QuestionThread
                        key={q.id}
                        question={q}
                        allQuestions={questions}
                        llmLoadingId={llmLoadingId}
                        onReply={(parentId) => {
                          setReplyToId(parentId);
                          setLlmQuestion("");
                        }}
                        onSubmitReply={handleAskLlm}
                        replyToId={replyToId}
                        setLlmQuestion={setLlmQuestion}
                        llmQuestion={llmQuestion}
                      />
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="col-span-3 border border-zinc-200 bg-white overflow-hidden"
          style={{ height: "100%" }}
        >
          <div style={{ height: "100%" }}>
            <Excalidraw
              initialData={excalidrawData || undefined}
              excalidrawAPI={(api) => {
                excalidrawAPIRef.current = api;
              }}
              UIOptions={excalidrawOptions}
            />
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-xs text-zinc-400 mb-2">
              // notes (shared)
            </label>
            <textarea
              value={notes}
              onChange={(e) => updateSession({ notes: e.target.value })}
              placeholder="Approach, algorithm, key decisions..."
              className="flex-1 p-3 border border-zinc-200 text-sm resize-none focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-xs text-zinc-400 mb-2">
              // private notes
            </label>
            <textarea
              value={privateNotes}
              onChange={(e) => updateSession({ privateNotes: e.target.value })}
              placeholder="Personal reminders, reminders to self..."
              className="flex-1 p-3 border border-zinc-200 text-sm resize-none focus:outline-none focus:border-zinc-400 bg-zinc-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface Question {
  id: string;
  text: string;
  answer?: string;
  timestamp: number;
  parentId?: string;
}

interface QuestionThreadProps {
  question: Question;
  allQuestions: Question[];
  llmLoadingId: string | null;
  onReply: (parentId: string) => void;
  onSubmitReply: () => void;
  replyToId: string | null;
  setLlmQuestion: (q: string) => void;
  llmQuestion: string;
}

function QuestionThread({
  question,
  allQuestions,
  llmLoadingId,
  onReply,
  onSubmitReply,
  replyToId,
  setLlmQuestion,
  llmQuestion,
}: QuestionThreadProps) {
  const replies = allQuestions.filter((q) => q.parentId === question.id);

  return (
    <div className="border-l-2 border-zinc-200 pl-2 space-y-1">
      <div className="text-xs">
        <div className="p-1.5 bg-zinc-50 text-zinc-600">{question.text}</div>
        {question.id.startsWith("temp-") && llmLoadingId === question.id ? (
          <div className="p-1.5 text-zinc-400">...</div>
        ) : question.answer ? (
          <div className="p-1.5 bg-zinc-100 text-zinc-500 whitespace-pre-wrap">
            {question.answer}
          </div>
        ) : null}
        <button
          onClick={() => onReply(question.id)}
          className="text-xs text-zinc-400 hover:text-zinc-600 mt-1 cursor-pointer"
        >
          reply
        </button>
      </div>

      {replies.map((reply) => (
        <div key={reply.id} className="border-l-2 border-zinc-300 pl-2">
          <div className="text-xs">
            <div className="p-1.5 bg-zinc-50 text-zinc-600">{reply.text}</div>
            {reply.id.startsWith("temp-") && llmLoadingId === reply.id ? (
              <div className="p-1.5 text-zinc-400">...</div>
            ) : reply.answer ? (
              <div className="p-1.5 bg-zinc-100 text-zinc-500 whitespace-pre-wrap">
                {reply.answer}
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {replyToId === question.id && (
        <div className="mt-1">
          <textarea
            value={llmQuestion}
            onChange={(e) => setLlmQuestion(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), onSubmitReply())
            }
            placeholder="Ask a follow-up..."
            className="w-full p-1.5 text-xs border border-zinc-300 resize-none focus:outline-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={onSubmitReply}
              disabled={!llmQuestion.trim()}
              className="px-2 py-1 text-xs bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
            >
              send
            </button>
            <button
              onClick={() => onReply("")}
              className="px-2 py-1 text-xs bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 cursor-pointer"
            >
              cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
