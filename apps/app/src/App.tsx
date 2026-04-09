import { useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { SessionPage } from './components/SessionPage';
import { ResultsPage } from './components/ResultsPage';

type Page = 'home' | 'config' | 'session' | 'results';

function App() {
  const [page, setPage] = useState<Page>('home');

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">whiteboard-practice_</h1>
        <nav className="flex gap-2">
          <button 
            onClick={() => setPage('home')}
            className="px-3 py-1.5 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 transition-colors"
          >
            home
          </button>
          <button 
            onClick={() => setPage('config')}
            className="px-3 py-1.5 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 transition-colors"
          >
            new-session
          </button>
        </nav>
      </header>

      <main className="flex-1 p-6">
        {page === 'home' && <HomePage onNewSession={() => setPage('config')} />}
        {page === 'config' && <ConfigPanel onStart={() => setPage('session')} />}
        {page === 'session' && <SessionPage onFinish={() => setPage('results')} />}
        {page === 'results' && <ResultsPage onHome={() => setPage('home')} />}
      </main>
    </div>
  );
}

function HomePage({ onNewSession }: { onNewSession: () => void }) {
  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      <p className="text-zinc-500 mb-4">// practice technical interviews</p>
      <h2 className="text-2xl font-light mb-8 text-zinc-800">whiteboard session runner</h2>
      <button 
        onClick={onNewSession}
        className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
      >
        start-session_
      </button>
    </div>
  );
}

export default App;