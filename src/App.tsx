import { useState, useRef, useCallback } from 'react';
import type { LLMConfig } from './types';
import { createLLMProvider } from './engine/llm';
import { SceneManager } from './engine/sceneManager';
import { defaultScene as sceneConfig } from './data/scenes';
import { getPlayerCharacter, getNpcCharacters } from './data/characters';
import GameScene from './components/GameScene';

function loadEnvConfig(): LLMConfig {
  return {
    provider: import.meta.env.VITE_LLM_PROVIDER || 'openai',
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
    model: import.meta.env.VITE_LLM_MODEL || '',
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || undefined,
  };
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<SceneManager | null>(null);

  const player = getPlayerCharacter();
  const npcs = getNpcCharacters();

  const handleStart = useCallback(async () => {
    setError(null);
    try {
      const config = loadEnvConfig();
      if (!config.apiKey) {
        setError('未配置 VITE_LLM_API_KEY，请检查 .env 文件。');
        return;
      }
      const provider = createLLMProvider(config);
      const manager = new SceneManager(provider, sceneConfig, npcs, player);
      managerRef.current = manager;
      setStarted(true);
      await manager.startGame();
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动失败');
    }
  }, [npcs, player]);

  const handleRestart = useCallback(async () => {
    setError(null);
    try {
      const config = loadEnvConfig();
      const provider = createLLMProvider(config);
      const manager = new SceneManager(provider, sceneConfig, npcs, player);
      managerRef.current = manager;
      setStarted(true);
      await manager.startGame();
    } catch (e) {
      setError(e instanceof Error ? e.message : '重启失败');
    }
  }, [npcs, player]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-sm mb-4" style={{ color: '#E24B4A' }}>{error}</p>
        <button
          onClick={handleStart}
          className="px-6 py-2.5 rounded-sm text-sm cursor-pointer transition-colors"
          style={{ backgroundColor: '#2a2a34', color: '#e8e0d0' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2a2a34'; }}
        >
          重试
        </button>
      </div>
    );
  }

  if (!started || !managerRef.current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1
          className="font-game text-2xl mb-2"
          style={{ color: '#e8e0d0' }}
        >
          玄武门之变
        </h1>
        <p className="text-sm mb-8" style={{ color: '#8a8070' }}>
          武德九年六月初四 · 长安
        </p>
        <button
          onClick={handleStart}
          className="px-8 py-3 rounded-sm text-sm font-ui cursor-pointer transition-colors"
          style={{ backgroundColor: '#2a2a34', color: '#e8e0d0' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2a2a34'; }}
        >
          开始密议
        </button>
      </div>
    );
  }

  return (
    <GameScene
      sceneManager={managerRef.current}
      scene={sceneConfig}
      npcs={npcs}
      onRestart={handleRestart}
    />
  );
}
