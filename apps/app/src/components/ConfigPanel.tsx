import { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { api } from '../lib/api';

interface ConfigPanelProps {
  onStart: () => void;
}

const defaultConfig = {
  problemType: 'dsa',
  context: {
    domain: 'fintech',
    role: 'fullstack',
    focusAreas: [] as string[],
  },
  spec: {
    difficulty: 'medium',
    topics: [] as string[],
    constraints: [] as string[],
    timeLimit: 30,
  },
  evaluation: {
    allowedLanguages: ['javascript', 'python'],
    priorities: ['correctness', 'communication', 'time-complexity'],
    criteria: [
      { name: 'problem-understanding', weight: 1, description: 'Correctly understood the problem' },
      { name: 'approach-clarity', weight: 1, description: 'Clearly explained the approach' },
      { name: 'code-correctness', weight: 2, description: 'Code produces correct output' },
      { name: 'time-complexity', weight: 1, description: 'Optimal time complexity' },
      { name: 'communication', weight: 1, description: 'Explained thoughts clearly' },
    ],
  },
};

export function ConfigPanel({ onStart }: ConfigPanelProps) {
  const { setSession, setIsLoading } = useSessionStore();
  const [formData, setFormData] = useState(defaultConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setIsLoading(true);

    try {
      const result = await api.generateProblem(formData as any);
      
      if (result.error) {
        setError(result.error);
        return;
      }

      setSession(result.sessionId, result.config, result.problem);
      onStart();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-light mb-6 text-zinc-800">// configure session</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">problem-type</label>
            <select
              value={formData.problemType}
              onChange={(e) => setFormData({ ...formData, problemType: e.target.value })}
              className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
            >
              <option value="dsa">dsa</option>
              <option value="system-design">system-design</option>
              <option value="frontend">frontend</option>
              <option value="backend">backend</option>
              <option value="behavioral">behavioral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-500 mb-1">difficulty</label>
            <select
              value={formData.spec.difficulty}
              onChange={(e) => setFormData({ ...formData, spec: { ...formData.spec, difficulty: e.target.value } })}
              className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">domain</label>
            <input
              type="text"
              value={formData.context.domain}
              onChange={(e) => setFormData({ ...formData, context: { ...formData.context, domain: e.target.value } })}
              className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-500 mb-1">role</label>
            <select
              value={formData.context.role}
              onChange={(e) => setFormData({ ...formData, context: { ...formData.context, role: e.target.value } })}
              className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
            >
              <option value="fullstack">fullstack</option>
              <option value="frontend">frontend</option>
              <option value="backend">backend</option>
              <option value="devops">devops</option>
              <option value="mobile">mobile</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-500 mb-1">time-limit (minutes)</label>
          <input
            type="number"
            min={5}
            max={120}
            value={formData.spec.timeLimit}
            onChange={(e) => setFormData({ ...formData, spec: { ...formData.spec, timeLimit: parseInt(e.target.value) || 30 } })}
            className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full mt-6 py-3 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors text-sm"
      >
        {isGenerating ? 'generating...' : 'generate-problem_'}
      </button>
    </div>
  );
}