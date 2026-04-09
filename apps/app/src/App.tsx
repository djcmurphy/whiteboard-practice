import { useState } from 'react'

type Page = 'home' | 'config' | 'session' | 'results'

function App() {
  const [page, setPage] = useState<Page>('home')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">whiteboard-practice_</h1>
        <nav className="flex gap-2">
          <button 
            onClick={() => setPage('home')}
            className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded"
          >
            home
          </button>
          <button 
            onClick={() => setPage('config')}
            className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded"
          >
            new-session
          </button>
        </nav>
      </header>

      <main className="flex-1 p-6">
        {page === 'home' && <HomePage onNewSession={() => setPage('config')} />}
        {page === 'config' && <ConfigPage onStart={() => setPage('session')} />}
        {page === 'session' && <SessionPage onFinish={() => setPage('results')} />}
        {page === 'results' && <ResultsPage onHome={() => setPage('home')} />}
      </main>
    </div>
  )
}

function HomePage({ onNewSession }: { onNewSession: () => void }) {
  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      <p className="text-zinc-500 mb-4">// practice technical interviews</p>
      <h2 className="text-2xl font-light mb-8">whiteboard session runner</h2>
      <button 
        onClick={onNewSession}
        className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-500 transition-colors rounded"
      >
        start-session_
      </button>
    </div>
  )
}

function ConfigPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-light mb-6">config-session_</h2>
      <button 
        onClick={onStart}
        className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded"
      >
        start_
      </button>
    </div>
  )
}

function SessionPage({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-500">// session running</span>
        <button 
          onClick={onFinish}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          finish_
        </button>
      </div>
      <div className="flex-1 border border-zinc-800 bg-zinc-900 rounded">
        <p className="text-zinc-600 p-4">whiteboard_</p>
      </div>
    </div>
  )
}

function ResultsPage({ onHome }: { onHome: () => void }) {
  return (
    <div className="max-w-lg mx-auto text-center">
      <h2 className="text-xl font-light mb-6">results_</h2>
      <button 
        onClick={onHome}
        className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded"
      >
        back-home_
      </button>
    </div>
  )
}

export default App