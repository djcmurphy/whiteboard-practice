import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import { ConfigPanel } from "./components/ConfigPanel";
import { SessionPage } from "./components/SessionPage";
import { ResultsPage } from "./components/ResultsPage";
import { LlmPanel } from "./components/LlmPanel";
import { ExamplesTable } from "./components/ExamplesTable";
import { ExampleDetailsPanel } from "./components/ExampleDetailsPanel";
import { useSessionStore } from "./stores/sessionStore";
import { api } from "./lib/api";

function HomePage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
  const { startSession } = useSessionStore();

  const handleStart = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const handleSelect = (exampleId: string) => {
    setSelectedExampleId(exampleId);
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      <div className="col-span-2 flex flex-col gap-4">
        <LlmPanel />
        <ConfigPanel onStart={handleStart} onGenerate={handleRefresh} />
      </div>
      <div className="col-span-6">
        <div className="bg-white border border-zinc-200 h-full overflow-hidden">
          <div className="p-3 border-b border-zinc-200 bg-zinc-50">
            <span className="text-xs text-zinc-500">// examples</span>
          </div>
          <ExamplesTable 
            key={refreshKey} 
            onStart={handleStart} 
            selectedId={selectedExampleId}
            onSelect={handleSelect}
          />
        </div>
      </div>
      <div className="col-span-4">
        <ExampleDetailsPanel exampleId={selectedExampleId} onStart={handleStart} />
      </div>
    </div>
  );
}

function ConfigPage() {
  const navigate = useNavigate();
  const { startSession } = useSessionStore();

  const handleStart = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  return <ConfigPanel onStart={handleStart} />;
}

function SessionRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionId, loadSession, problem } = useSessionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId === id) {
      setIsLoading(false);
      return;
    }

    async function load() {
      if (!id) return;
      try {
        const session = await api.getSession(id);
        loadSession({
          sessionId: session.id,
          config: session.config,
          problem: session.problem,
          notes: session.notes || "",
          privateNotes: "",
          questions: session.questions || [],
          excalidrawData: session.excalidrawData,
          elapsedSeconds: session.elapsedSeconds || 0,
          isPaused: session.isPaused || false,
          showExamples: false,
          showConstraints: false,
        });
      } catch (e) {
        console.error("Failed to load session:", e);
        navigate("/");
      }
      setIsLoading(false);
    }
    load();
  }, [id]);

  if (isLoading || !problem) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500">Loading session...</p>
      </div>
    );
  }

  return <SessionPage onFinish={() => navigate("/results")} />;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-zinc-900"
          >
            whiteboard-practice_
          </Link>
          <nav className="flex gap-2">
            <Link
              to="/"
              className="px-3 py-1.5 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200"
            >
              home
            </Link>
            <Link
              to="/"
              className="px-3 py-1.5 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200"
            >
              new-session
            </Link>
          </nav>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden p-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/session/:id" element={<SessionRoute />} />
            <Route path="/results" element={<ResultsPageWrapper />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function ResultsPageWrapper() {
  const navigate = useNavigate();
  const { evaluationResult } = useSessionStore();

  if (!evaluationResult) {
    navigate("/");
    return null;
  }

  return <ResultsPage onHome={() => navigate("/")} />;
}

export default App;
