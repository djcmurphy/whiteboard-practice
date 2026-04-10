import { useState } from 'react';
import { api } from '../lib/api';

interface ConfigPanelProps {
  onStart: (sessionId: string) => void;
  onGenerate?: () => void;
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
  showExamples: true,
  showConstraints: true,
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

export function ConfigPanel({ onStart, onGenerate }: ConfigPanelProps) {
  const [formData, setFormData] = useState(defaultConfig);
  const [count, setCount] = useState(3);
  const [customNotes, setCustomNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const result = await api.generateExamples(formData as any, count, customNotes);
      
      if ('error' in result) {
        setError(String(result.error));
        return;
      }
      
      if (onGenerate) {
        onGenerate();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200">
      <div className="p-2 border-b border-zinc-100 bg-zinc-50">
        <span className="text-xs text-zinc-500">// config</span>
      </div>
      <div className="p-4 space-y-4">
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

        <div>
          <label className="block text-sm text-zinc-500 mb-1">time-limit (min)</label>
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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-zinc-500 mb-1">generate count</label>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex gap-4 items-end">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={formData.showExamples}
              onChange={(e) => setFormData({ ...formData, showExamples: e.target.checked })}
              className="w-4 h-4"
            />
            show-examples
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={formData.showConstraints}
              onChange={(e) => setFormData({ ...formData, showConstraints: e.target.checked })}
              className="w-4 h-4"
            />
            show-constraints
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-zinc-500 mb-1">custom requirements</label>
        <textarea
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Add custom requirements or notes for the problems..."
          className="w-full p-2 border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-500"
          rows={3}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full py-3 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors text-sm"
      >
        {isGenerating ? 'generating...' : 'generate-examples_'}
      </button>
    </div>
  );
}