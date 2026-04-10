import { useState, useEffect } from "react";
import { api, LlmStatus, LlmModel } from "../lib/api";

export function LlmPanel() {
  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const s = await api.getLlmStatus();
        setStatus(s);
        setError(null);
        return;
      } catch (e) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1000));
        } else {
          setError(String(e));
        }
      }
    }
  };

  const handleModelChange = async (modelId: string) => {
    setIsLoading(true);
    try {
      const s = await api.setLlmModel(modelId);
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
    setIsLoading(false);
  };

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="p-2 border-b border-zinc-200 bg-zinc-100">
        <span className="text-xs text-zinc-500">// LLM</span>
      </div>
      <div className="p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs">{error}</div>
        )}
        
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {status?.connected ? 'Connected' : 'Disconnected'}
          </div>
          {status?.serverUrl && (
            <p className="text-xs text-zinc-400">{status.serverUrl}</p>
          )}
          <p className="text-xs text-zinc-400 mt-1">Model: {status?.currentModel || 'none'}</p>
        </div>

        {status?.availableModels && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Model</label>
            <select
              value={status.currentModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isLoading}
              className="w-full p-2 text-sm border border-zinc-200 bg-white focus:outline-none focus:border-zinc-400 disabled:opacity-50"
            >
              {status.availableModels.map((m: LlmModel) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {isLoading && <p className="text-xs text-zinc-400 mt-1">Connecting...</p>}
          </div>
        )}

        {!status && !error && (
          <p className="text-xs text-zinc-400">Loading...</p>
        )}
      </div>
    </div>
  );
}