import { useState } from "react";
import { ConfigPanel } from "./components/ConfigPanel";
import { SessionPage } from "./components/SessionPage";
import { ResultsPage } from "./components/ResultsPage";

type Page = "home" | "config" | "session" | "results";

function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          whiteboard-practice_
        </h1>
        <nav className="flex gap-2">
          <button
            onClick={() => setPage("home")}
            className="px-3 py-1.5 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200"
          >
            home
          </button>
          <button
            onClick={() => setPage("config")}
            className="px-3 py-1.5 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200"
          >
            new-session
          </button>
        </nav>
      </header>

      <main className="flex-1 p-6">
        {page === "home" && <HomePage onNewSession={() => setPage("config")} />}
        {page === "config" && (
          <ConfigPanel onStart={() => setPage("session")} />
        )}
        {page === "session" && <SessionPage onFinish={() => setPage("results")} />}
        {page === "results" && <ResultsPage onHome={() => setPage("home")} />}
      </main>
    </div>
  );
}

function HomePage({ onNewSession }: { onNewSession: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponse("...");

    try {
      const res = await fetch("http://localhost:3001/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      setResponse("Error: " + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-zinc-500 mb-4">// practice technical interviews</p>
        <h2 className="text-2xl font-light mb-8 text-zinc-800">
          whiteboard session runner
        </h2>
        <button
          onClick={onNewSession}
          className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-700"
        >
          start-session_
        </button>
      </div>

      <div className="border border-zinc-300 bg-white">
        <div className="p-2 border-b border-zinc-200 bg-zinc-100">
          <span className="text-xs text-zinc-500">// LLM TEST</span>
        </div>
        <div className="p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Test prompt..."
            className="w-full h-24 p-2 border border-zinc-200 text-sm resize-none focus:outline-none focus:border-zinc-400"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleTest}
              disabled={isLoading}
              className="px-4 py-2 bg-zinc-900 text-white text-sm hover:bg-zinc-700 disabled:opacity-50"
            >
              {isLoading ? "..." : "send"}
            </button>
          </div>
          {response && (
            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 max-h-64 overflow-auto whitespace-pre-wrap text-sm text-zinc-600">
                {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
