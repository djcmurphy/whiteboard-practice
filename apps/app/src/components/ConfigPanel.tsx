import { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import type { SessionConfig } from '../types';

const defaultConfig: SessionConfig = {
  problemType: 'dsa',
  context: {
    domain: 'fintech',
    role: 'fullstack',
    focusAreas: [],
  },
  spec: {
    difficulty: 'medium',
    topics: [],
    constraints: [],
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

const problemBank: Record<string, Record<string, string[]>> = {
  dsa: {
    easy: ['Reverse a linked list', 'Check if a string is a palindrome', 'Find the maximum element in an array'],
    medium: ['Find the median of two sorted arrays', 'Longest substring without repeating characters', 'Container with most water', 'Merge intervals'],
    hard: ['Merge k sorted lists', 'Trapping rain water', 'Sudoku solver'],
  },
  'system-design': {
    easy: ['Design a basic key-value store', 'Design a counter API'],
    medium: ['Design a URL shortener', 'Design a Twitter timeline', 'Design a parking lot system'],
    hard: ['Design a ride-sharing service like Uber', 'Design a payments system', 'Design Google Search'],
  },
  frontend: {
    easy: ['Build a toggle component', 'Build a modal component'],
    medium: ['Design a data table with sorting', 'Build a form with validation', 'Implement infinite scroll'],
    hard: ['Design a drag-and-drop system', 'Build a rich text editor'],
  },
  backend: {
    easy: ['Design a REST API for a todo list', 'Design a user registration endpoint'],
    medium: ['Design an API for a blog system', 'Design a rate limiter', 'Design a notification system'],
    hard: ['Design a message queue system', 'Design a real-time chat system'],
  },
  behavioral: {
    easy: ['Tell me about yourself', 'Describe a challenging project'],
    medium: ['Tell me about a time you failed', 'Describe a conflict with a coworker'],
    hard: ['Tell me about a time you had to deliver under pressure', 'Describe a time you had to influence someone'],
  },
};

interface ConfigPanelProps {
  onStart: () => void;
}

export function ConfigPanel({ onStart }: ConfigPanelProps) {
  const { setConfig, setProblem } = useSessionStore();
  const [formData, setFormData] = useState(defaultConfig);

  const generateProblem = () => {
    const problems = problemBank[formData.problemType]?.[formData.spec.difficulty] || [];
    if (problems.length === 0) return;
    const random = problems[Math.floor(Math.random() * problems.length)];
    setFormData({ ...formData, spec: { ...formData.spec, timeLimit: formData.spec.timeLimit } });
    return random;
  };

  const handleStart = () => {
    const problem = generateProblem();
    setConfig(formData);
    setProblem(problem || 'Solve the problem');
    onStart();
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-light mb-6 text-zinc-800">// configure session</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">problem-type</label>
            <select
              value={formData.problemType}
              onChange={(e) => setFormData({ ...formData, problemType: e.target.value as any })}
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
              onChange={(e) => setFormData({ ...formData, spec: { ...formData.spec, difficulty: e.target.value as any } })}
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
        onClick={handleStart}
        className="w-full mt-6 py-3 bg-zinc-900 text-white hover:bg-zinc-700 transition-colors text-sm"
      >
        start-session_
      </button>
    </div>
  );
}