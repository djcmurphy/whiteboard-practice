import { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { api } from '../lib/api';

interface ConfigPanelProps {
  onStart: (sessionId: string) => void;
}

const defaultConfig = {
  problemType: 'dsa',
  context: {
    domain: 'general',
    focusAreas: [] as string[],
  },
  spec: {
    difficulty: 'medium',
    topics: [] as string[],
    constraints: [] as string[],
    timeLimit: 30,
  },
  showExamples: false,
  showConstraints: false,
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
  const { startSession, setShowOptions } = useSessionStore();
  const [formData, setFormData] = useState(defaultConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    console.log('[ConfigPanel] Starting generate...');
    setIsGenerating(true);
    setError('');

    try {
      console.log('[ConfigPanel] Calling API with config:', formData);
      const result = await api.generateProblem(formData as any);
      console.log('[ConfigPanel] API result:', result);
      
      if ('error' in result) {
        setError(String(result.error));
        return;
      }

      startSession(result.sessionId, result.config as any, result.problem);
      setShowOptions(formData.showExamples, formData.showConstraints);
      onStart(result.sessionId);
    } catch (err) {
      console.error('[ConfigPanel] Error:', err);
      setError(String(err));
    } finally {
      setIsGenerating(false);
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
              <option value="fullstack">fullstack</option>
              <option value="mobile">mobile</option>
              <option value="devops">devops</option>
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
            <select
              value={formData.context.domain}
              onChange={(e) => setFormData({ ...formData, context: { ...formData.context, domain: e.target.value } })}
              className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
            >
              <option value="general">general</option>
              <option value="fintech">fintech</option>
              <option value="healthcare">healthcare</option>
              <option value="e-commerce">e-commerce</option>
              <option value="saas">saas</option>
              <option value="gaming">gaming</option>
              <option value="social">social</option>
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

        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={formData.showExamples}
              onChange={(e) => setFormData({ ...formData, showExamples: e.target.checked })}
              className="w-4 h-4"
            />
            show-examples
            <span className="text-xs text-zinc-400">(sample inputs)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={formData.showConstraints}
              onChange={(e) => setFormData({ ...formData, showConstraints: e.target.checked })}
              className="w-4 h-4"
            />
            show-constraints
            <span className="text-xs text-zinc-400">(limits to solve with)</span>
          </label>
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