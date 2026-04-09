import { useSessionStore } from '../stores/sessionStore';

interface ResultsPageProps {
  onHome: () => void;
}

export function ResultsPage({ onHome }: ResultsPageProps) {
  const { evaluationResult, config, problem, reset } = useSessionStore();

  const handleNewSession = () => {
    reset();
    onHome();
  };

  if (!evaluationResult) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <p className="text-zinc-500 mb-4">// no results yet</p>
        <button
          onClick={handleNewSession}
          className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-700 text-sm"
        >
          back-home_
        </button>
      </div>
    );
  }

  const { scores, overallScore, grade, strengths, improvements, suggestions, followUpQuestions } = evaluationResult;

  const gradeColors: Record<string, string> = {
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    'needs-improvement': 'bg-yellow-100 text-yellow-700',
    poor: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Problem summary */}
      {problem && (
        <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200">
          <p className="text-xs text-zinc-400 mb-1">// problem</p>
          <p className="font-medium text-zinc-800">{problem.title}</p>
          <p className="text-sm text-zinc-500 mt-1">{problem.description}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200">
        <h2 className="text-xl font-light text-zinc-800">// results</h2>
        <div className="flex items-center gap-4">
          <span className="text-4xl font-mono font-bold text-zinc-800">{overallScore}%</span>
          <span className={`px-3 py-1 text-sm ${gradeColors[grade]}`}>
            {grade.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Criteria scores */}
      <div className="mb-8">
        <h3 className="text-sm text-zinc-500 mb-4">// evaluation breakdown</h3>
        <div className="space-y-3">
          {config?.evaluation.criteria.map((criterion) => {
            const scoreData = scores[criterion.name];
            const score = scoreData?.score || 0;
            const maxScore = scoreData?.maxScore || 5;
            const percentage = (score / maxScore) * 100;

            return (
              <div key={criterion.name} className="flex items-center gap-3">
                <span className="w-40 text-sm text-zinc-600">{criterion.name}</span>
                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-800 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-sm text-zinc-500 text-right">
                  {score}/{maxScore}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback sections */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="p-4 bg-green-50 border border-green-100">
          <h3 className="text-sm font-medium text-green-800 mb-3">// strengths</h3>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-green-700">+ {s}</li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-red-50 border border-red-100">
          <h3 className="text-sm font-medium text-red-800 mb-3">// improvements</h3>
          <ul className="space-y-2">
            {improvements.map((i, idx) => (
              <li key={idx} className="text-sm text-red-700">- {i}</li>
            ))}
          </ul>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mb-8 p-4 bg-zinc-50 border border-zinc-200">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">// suggestions</h3>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="text-sm text-zinc-600">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {followUpQuestions && followUpQuestions.length > 0 && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-3">// follow-up questions</h3>
          <ul className="space-y-2">
            {followUpQuestions.map((q, i) => (
              <li key={i} className="text-sm text-blue-700">? {q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={handleNewSession}
          className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-700 text-sm"
        >
          new-session_
        </button>
      </div>
    </div>
  );
}