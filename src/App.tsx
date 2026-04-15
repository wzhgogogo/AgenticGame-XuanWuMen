import { useState, useRef, useCallback, useEffect } from 'react';
import type { LLMConfig, SceneConfig, Character, ISceneManager } from './types';
import type { WorldState, GameMode, WorldTickResult } from './types/world';
import { createLLMProvider } from './engine/llm';
import type { LLMProvider } from './engine/llm';
import { SceneManager } from './engine/sceneManager';
import { WorldSimulator } from './engine/world/worldSimulator';
import { loadWorldState } from './engine/world/worldState';
import { characters, getPlayerCharacter, getNpcCharacters } from './data/characters';
import GameScene from './components/GameScene';
import EndingScreen from './components/EndingScreen';
import DailyActivityScreen from './components/DailyActivityScreen';
import DailyBriefingScreen from './components/DailyBriefingScreen';

function loadEnvConfig(): LLMConfig {
  // 安全检查：非 localhost 环境下不暴露 API Key
  const hostname = window.location.hostname;
  const isSafe = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  if (!isSafe && import.meta.env.VITE_LLM_API_KEY) {
    console.error('[安全警告] 检测到非本地环境，API Key 不应直接暴露在前端。请使用后端代理。');
    return {
      provider: import.meta.env.VITE_LLM_PROVIDER || 'openai',
      apiKey: '',
      model: import.meta.env.VITE_LLM_MODEL || '',
      baseUrl: import.meta.env.VITE_LLM_BASE_URL || undefined,
    };
  }

  return {
    provider: import.meta.env.VITE_LLM_PROVIDER || 'openai',
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
    model: import.meta.env.VITE_LLM_MODEL || '',
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || undefined,
  };
}

export default function App() {
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('title_screen');
  const [error, setError] = useState<string | null>(null);
  const [tickResult, setTickResult] = useState<WorldTickResult | null>(null);
  const [sceneManager, setSceneManager] = useState<ISceneManager | null>(null);
  const [currentSceneConfig, setCurrentSceneConfig] = useState<SceneConfig | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const simulatorRef = useRef<WorldSimulator | null>(null);
  const llmProviderRef = useRef<LLMProvider | null>(null);

  const player = getPlayerCharacter();
  const npcs = getNpcCharacters();

  // 订阅 WorldSimulator 状态变化
  const handleWorldUpdate = useCallback((state: WorldState, mode: GameMode) => {
    setWorldState(state);
    setGameMode(mode);
  }, []);

  const handleStart = useCallback(() => {
    setError(null);
    try {
      const config = loadEnvConfig();
      if (!config.apiKey) {
        setError('未配置 VITE_LLM_API_KEY，请检查 .env 文件。');
        return;
      }
      const provider = createLLMProvider(config);
      llmProviderRef.current = provider;

      const simulator = new WorldSimulator(provider, characters, player);
      simulatorRef.current = simulator;
      simulator.subscribe(handleWorldUpdate);
      simulator.startGame();
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动失败');
    }
  }, [player, handleWorldUpdate]);

  const handleRestart = useCallback(() => {
    setWorldState(null);
    setGameMode('title_screen');
    setTickResult(null);
    setSceneManager(null);
    setCurrentSceneConfig(null);
    if (simulatorRef.current) {
      simulatorRef.current.clearSave();
    }
    simulatorRef.current = null;
    llmProviderRef.current = null;
    handleStart();
  }, [handleStart]);

  // 继续存档
  const handleContinue = useCallback(() => {
    setError(null);
    try {
      const config = loadEnvConfig();
      if (!config.apiKey) {
        setError('未配置 VITE_LLM_API_KEY，请检查 .env 文件。');
        return;
      }
      const provider = createLLMProvider(config);
      llmProviderRef.current = provider;

      const simulator = new WorldSimulator(provider, characters, player);
      simulatorRef.current = simulator;
      simulator.subscribe(handleWorldUpdate);

      if (!simulator.restoreGame()) {
        simulator.startGame();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '恢复存档失败');
    }
  }, [player, handleWorldUpdate]);

  // 日常活动选择
  const handleSelectActivity = useCallback((activity: import('./types/world').DailyActivity) => {
    const simulator = simulatorRef.current;
    if (!simulator) return '';
    return simulator.applyActivity(activity);
  }, []);

  // 结束今日
  const handleEndDay = useCallback(async () => {
    const simulator = simulatorRef.current;
    if (!simulator) return;
    setLoading('夜幕降临，长安城渐渐安静下来……');
    try {
      const result = await simulator.endDay();
      setTickResult(result);
    } catch (e) {
      console.error('endDay failed:', e);
    } finally {
      setLoading(null);
    }
  }, []);

  // 从日报继续
  const handleProceedFromBriefing = useCallback(async () => {
    const simulator = simulatorRef.current;
    if (!simulator) return;

    const hasEvents = simulator.getState().pendingEvents.length > 0;
    if (hasEvents) {
      setLoading('事态正在发展……');
    }

    try {
      await simulator.proceedFromBriefing();

      // 检查是否进入了事件场景
      if (simulator.getMode() === 'event_scene') {
        const sceneConfig = simulator.getEventSceneConfig();
        if (sceneConfig && llmProviderRef.current) {
          const sceneNpcs = npcs.filter((c) => sceneConfig.activeNpcIds?.includes(c.id));
          const sm = new SceneManager(
            llmProviderRef.current,
            sceneConfig,
            sceneNpcs,
            player,
          );
          setSceneManager(sm);
          setCurrentSceneConfig(sceneConfig);
          await sm.startGame();
        }
      }
    } catch (e) {
      console.error('proceedFromBriefing failed:', e);
    } finally {
      setLoading(null);
    }
  }, [npcs, player]);

  // 事件场景结束
  const handleSceneEnd = useCallback((summary: string) => {
    const simulator = simulatorRef.current;
    if (!simulator) return;
    simulator.handleEventEnd(summary);
    setSceneManager(null);
    setCurrentSceneConfig(null);
  }, []);

  // 加载过渡画面
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p
          className="font-game text-sm animate-fade-in"
          style={{ color: '#8a8070' }}
        >
          {loading}
        </p>
        <div className="mt-4 thinking-dots" style={{ color: '#4a4a50' }} />
      </div>
    );
  }

  // 错误画面
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

  // 开屏
  if (gameMode === 'title_screen') {
    const hasSave = !!loadWorldState();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="font-game text-2xl mb-2" style={{ color: '#e8e0d0' }}>
          玄武门之变
        </h1>
        <p className="text-sm mb-8" style={{ color: '#8a8070' }}>
          武德九年 · 长安
        </p>
        <div className="flex flex-col gap-3">
          {hasSave && (
            <button
              onClick={handleContinue}
              className="px-8 py-3 rounded-sm text-sm font-ui cursor-pointer transition-colors"
              style={{ backgroundColor: '#2a2a34', color: '#e8e0d0' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2a2a34'; }}
            >
              继续游戏
            </button>
          )}
          <button
            onClick={handleStart}
            className="px-8 py-3 rounded-sm text-sm font-ui cursor-pointer transition-colors"
            style={{
              backgroundColor: hasSave ? '#1a1a24' : '#2a2a34',
              color: hasSave ? '#8a8070' : '#e8e0d0',
              border: hasSave ? '1px solid #2a2a34' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = hasSave ? '#1a1a24' : '#2a2a34'; }}
          >
            {hasSave ? '新游戏' : '开始'}
          </button>
        </div>
      </div>
    );
  }

  // 日常活动
  if (gameMode === 'daily_activities' && worldState) {
    return (
      <DailyActivityScreen
        state={worldState}
        onSelectActivity={handleSelectActivity}
        onEndDay={handleEndDay}
      />
    );
  }

  // 日报
  if (gameMode === 'daily_briefing' && worldState && tickResult) {
    return (
      <DailyBriefingScreen
        state={worldState}
        tickResult={tickResult}
        hasEvents={worldState.pendingEvents.length > 0}
        onProceed={handleProceedFromBriefing}
      />
    );
  }

  // 事件场景
  if (gameMode === 'event_scene' && sceneManager && currentSceneConfig) {
    const sceneNpcs = npcs.filter((c) => currentSceneConfig.activeNpcIds?.includes(c.id));
    return (
      <EventSceneWrapper
        sceneManager={sceneManager}
        scene={currentSceneConfig}
        npcs={sceneNpcs}
        onEnd={handleSceneEnd}
      />
    );
  }

  // 游戏结束
  if (gameMode === 'game_over') {
    const simulator = simulatorRef.current;
    const lastEvent = simulator?.getState().eventLog.slice(-1)[0];
    return (
      <EndingScreen
        endingText={lastEvent?.summary || '历史的车轮滚滚向前，武德九年终于画上了句号。'}
        onRestart={handleRestart}
      />
    );
  }

  return null;
}

// 事件场景包装组件：监听 SceneManager 的 ending 状态，通知父级
function EventSceneWrapper({
  sceneManager,
  scene,
  npcs,
  onEnd,
}: {
  sceneManager: ISceneManager;
  scene: SceneConfig;
  npcs: Character[];
  onEnd: (summary: string) => void;
}) {
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    endedRef.current = false;
    const unsubscribe = sceneManager.subscribe((state) => {
      if (state.status === 'ending' && state.endingText && !endedRef.current) {
        endedRef.current = true;
        timerRef.current = setTimeout(() => {
          onEnd(state.endingText || '事件结束。');
        }, 5000);
      }
    });
    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sceneManager, onEnd]);

  return (
    <GameScene
      sceneManager={sceneManager}
      scene={scene}
      npcs={npcs}
    />
  );
}
