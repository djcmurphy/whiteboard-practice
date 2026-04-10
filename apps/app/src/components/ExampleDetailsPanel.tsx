import { useState, useEffect } from 'react';
import { api, Example } from '../lib/api';

interface ExampleDetailsPanelProps {
  exampleId: string | null;
  onStart: (sessionId: string) => void;
}

export function ExampleDetailsPanel({ exampleId, onStart }: ExampleDetailsPanelProps) {
  const [example, setExample] = useState<Example | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!exampleId) {
      setExample(null);
      return;
    }
    
    async function load() {
      setIsLoading(true);
      try {
        const result = await api.getExamples();
        const found = result.examples.find(e => e.id === exampleId);
        setExample(found || null);
      } catch (e) {
        console.error('Failed to load example:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [exampleId]);

  if (!exampleId) {
    return (
      <div className="bg-white border border-zinc-200 h-full">
        <div className="p-3 border-b border-zinc-200 bg-zinc-50">
          <span className="text-xs text-zinc-500">// details</span>
        </div>
        <div className="p-4 text-center text-zinc-400 text-sm">
          Select an example to view details
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-zinc-200 h-full">
        <div className="p-3 border-b border-zinc-200 bg-zinc-50">
          <span className="text-xs text-zinc-500">// details</span>
        </div>
        <div className="p-4 text-center text-zinc-400 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (!example) {
    return (
      <div className="bg-white border border-zinc-200 h-full">
        <div className="p-3 border-b border-zinc-200 bg-zinc-50">
          <span className="text-xs text-zinc-500">// details</span>
        </div>
        <div className="p-4 text-center text-zinc-400 text-sm">
          Example not found
        </div>
      </div>
    );
  }

  const handleStart = async () => {
    if (!example) return;
    try {
      const result = await api.startFromExample(example.id);
      onStart(result.sessionId);
    } catch (e) {
      console.error('Failed to start session:', e);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 h-full overflow-auto">
      <div className="p-3 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center">
        <span className="text-xs text-zinc-500">// details</span>
        <button
          onClick={handleStart}
          className="px-3 py-1 bg-zinc-900 text-white text-xs hover:bg-zinc-700"
        >
          start
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex gap-4 text-xs text-zinc-500">
          <span>type: {example.problemType}</span>
          <span>difficulty: {example.difficulty}</span>
        </div>
        
        <div>
          <p className="text-xs text-zinc-400 mb-2">// title</p>
          <p className="text-sm font-medium text-zinc-800">{example.title}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-400 mb-2">// description</p>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">
            {example.description || 'No description'}
          </p>
        </div>

        {example.examples && example.examples.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 mb-2">// examples</p>
            <div className="text-sm text-zinc-700 space-y-2">
              {example.examples.map((ex, i) => (
                <p key={i} className="whitespace-pre-wrap bg-zinc-50 p-2">{ex}</p>
              ))}
            </div>
          </div>
        )}

        {example.constraints && example.constraints.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 mb-2">// constraints</p>
            <ul className="text-sm text-zinc-700 list-disc list-inside space-y-1">
              {example.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {example.hints && example.hints.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 mb-2">// hints</p>
            <ul className="text-sm text-zinc-700 list-disc list-inside space-y-1">
              {example.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}

        {example.customNotes && (
          <div>
            <p className="text-xs text-zinc-400 mb-2">// custom notes</p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap bg-zinc-50 p-2">
              {example.customNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}