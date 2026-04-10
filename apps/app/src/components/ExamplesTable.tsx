import { useState, useEffect } from 'react';
import { api, Example } from '../lib/api';

interface ExamplesTableProps {
  onStart: (sessionId: string) => void;
  selectedId?: string | null;
  onSelect?: (exampleId: string) => void;
}

export function ExamplesTable({ onStart, selectedId, onSelect }: ExamplesTableProps) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    setIsLoading(true);
    try {
      const result = await api.getExamples();
      setExamples(result.examples);
    } catch (e) {
      console.error('Failed to load examples:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (exampleId: string) => {
    try {
      await api.deleteExample(exampleId);
      setExamples(examples.filter(e => e.id !== exampleId));
    } catch (e) {
      console.error('Failed to delete example:', e);
    }
  };

  const handleStart = async (exampleId: string) => {
    try {
      const result = await api.startFromExample(exampleId);
      onStart(result.sessionId);
    } catch (e) {
      console.error('Failed to start session:', e);
    }
  };

  const handleRowClick = (exampleId: string) => {
    if (onSelect) {
      onSelect(exampleId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-zinc-400 text-sm">
        Loading examples...
      </div>
    );
  }

  if (examples.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-400 text-sm">
        No examples yet. Generate some above.
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-zinc-300">
            <th className="text-left p-3 text-zinc-500 font-medium text-xs uppercase">type</th>
            <th className="text-left p-3 text-zinc-500 font-medium text-xs uppercase">difficulty</th>
            <th className="text-left p-3 text-zinc-500 font-medium text-xs uppercase">title</th>
            <th className="text-left p-3 text-zinc-500 font-medium text-xs uppercase">created</th>
            <th className="text-left p-3 text-zinc-500 font-medium text-xs uppercase">actions</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((example) => (
            <tr 
              key={example.id} 
              className={`border-b border-zinc-200 cursor-pointer ${selectedId === example.id ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}
              onClick={() => handleRowClick(example.id)}
            >
              <td className="p-3 text-zinc-700">{example.problemType}</td>
              <td className="p-3 text-zinc-700">{example.difficulty}</td>
              <td className="p-3 text-zinc-700 max-w-xs truncate" title={example.title}>
                {example.title}
              </td>
              <td className="p-3 text-zinc-500 text-xs">
                {new Date(example.createdAt).toLocaleString()}
              </td>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleStart(example.id)}
                  className="px-3 py-1 bg-zinc-900 text-white text-xs hover:bg-zinc-700 mr-2"
                >
                  start
                </button>
                <button
                  onClick={() => handleDelete(example.id)}
                  className="px-3 py-1 border border-zinc-300 text-zinc-600 text-xs hover:bg-zinc-100"
                >
                  delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}