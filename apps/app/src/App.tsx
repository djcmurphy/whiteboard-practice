import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import { ConfigPanel } from "./components/ConfigPanel";
import { SessionPage } from "./components/SessionPage";
import { ResultsPage } from "./components/ResultsPage";
import { useSessionStore } from "./stores/sessionStore";
import { api } from "./lib/api";

function HomePage() {
  const navigate = useNavigate();
  const { sessionId, loadSession } = useSessionStore();
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lastSessionId");
    setLastSessionId(saved);
  }, []);

  const handleResume = async () => {
    if (!lastSessionId) return;
    setIsResuming(true);
    try {
      const session = await api.getSession(lastSessionId);
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
      navigate(`/session/${session.id}`);
    } catch (e) {
      console.error("Failed to resume session:", e);
      localStorage.removeItem("lastSessionId");
      setLastSessionId(null);
    }
    setIsResuming(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-zinc-500 mb-4">// practice technical interviews</p>
        <h2 className="text-2xl font-light mb-8 text-zinc-800">
          whiteboard session runner
        </h2>
        <div className="flex gap-4 justify-center">
          <Link
            to="/config"
            className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-700"
          >
            start-session_
          </Link>
          {lastSessionId && (
            <button
              onClick={handleResume}
              disabled={isResuming}
              className="px-6 py-3 bg-zinc-100 border border-zinc-300 hover:bg-zinc-200"
            >
              {isResuming ? "..." : "resume"}
            </button>
          )}
        </div>
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
              to="/config"
              className="px-3 py-1.5 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200"
            >
              new-session
            </Link>
          </nav>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden p-6 ">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/config" element={<ConfigPage />} />
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
