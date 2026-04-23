import { useState, useRef, useCallback, useEffect } from 'react';
import type { LLMConfig, SceneConfig, Character, ISceneManager } from './types';
import type { WorldState, GameMode, WorldTickResult } from './types/world';
import type { DeskCanvasState } from './renderer/GameCanvasContext';
import { createLLMProvider } from './engine/llm';
import type { LLMProvider } from './engine/llm';
import { SceneManager } from './engine/sceneManager';
import { WorldSimulator } from './engine/world/worldSimulator';
import { loadWorldState } from './engine/world/worldState';
import { getNarrativeIntensity } from './engine/world/pressure';
import { getDebugEntries, subscribeDebugLog, clearDebugLog } from './engine/debugLog';
import { characters, getPlayerCharacter, getNpcCharacters } from './data/characters';
import GameScene from './components/GameScene';
import EndingScreen from './components/EndingScreen';
import DailyActivityScreen from './components/DailyActivityScreen';
import DailyBriefingScreen from './components/DailyBriefingScreen';
import DebugPanel from './components/DebugPanel';
import { GameCanvas } from './renderer/GameCanvas';
import { GameCanvasContext } from './renderer/GameCanvasContext';
import type { SceneType, CanvasEvent } from './renderer/GameCanvasContext';

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

const GAME_MODE_TO_SCENE: Record<GameMode, SceneType> = {
  title_screen: 'title',
  daily_activities: 'desk',
  daily_briefing: 'briefing',
  event_scene: 'scene',
  game_over: 'ending',
};

export default function App() {
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('title_screen');
  const [error, setError] = useState<string | null>(null);
  const [tickResult, setTickResult] = useState<WorldTickResult | null>(null);
  const [sceneManager, setSceneManager] = useState<ISceneManager | null>(null);
  const [currentSceneConfig, setCurrentSceneConfig] = useState<SceneConfig | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [deskCanvasState, setDeskCanvasState] = useState<DeskCanvasState | null>(null);

  const simulatorRef = useRef<WorldSimulator | null>(null);
  const llmProviderRef = useRef<LLMProvider | null>(null);

  const [debugOpen, setDebugOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).has('debug'));
  const [debugEntries, setDebugEntries] = useState(getDebugEntries);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const unsub = subscribeDebugLog(setDebugEntries);
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); setDebugOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => { unsub(); window.removeEventListener('keydown', onKey); };
  }, []);

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
    setLoading('夜色已深，长安城渐渐安静下来……');
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

  const handleCanvasEvent = useCallback((event: CanvasEvent) => {
    // Will be used by DailyActivityScreen to handle desk object clicks
    void event;
  }, []);

  const sceneType = loading ? 'loading' as SceneType : GAME_MODE_TO_SCENE[gameMode] || 'title';

  const canvasCtx = {
    sceneType,
    deskState: deskCanvasState,
    scenePhase: 0,
    onCanvasEvent: handleCanvasEvent,
  };

  const wrapWithCanvas = (children: React.ReactNode) => (
    <GameCanvasContext.Provider value={canvasCtx}>
      <GameCanvas />
      {children}
    </GameCanvasContext.Provider>
  );

  const debugPanel = import.meta.env.DEV && debugOpen ? (
    <DebugPanel
      worldState={worldState}
      narrativeIntensity={worldState ? getNarrativeIntensity(worldState.pressureAxes).level : '-'}
      logEntries={[...debugEntries]}
      onClear={clearDebugLog}
    />
  ) : null;

  // 加载过渡画面
  if (loading) {
    return wrapWithCanvas(
      <>
        <div className="h-screen relative flex flex-col items-center justify-center px-4">
          <p
            className="relative z-10 font-game text-sm animate-fade-in"
            style={{ color: '#8a8070' }}
          >
            {loading}
          </p>
          <div className="relative z-10 mt-4 thinking-dots" style={{ color: '#4a4a50' }} />
        </div>
        {debugPanel}
      </>
    );
  }

  // 错误画面
  if (error) {
    return wrapWithCanvas(
      <>
        <div className="h-screen relative flex flex-col items-center justify-center px-4">
          <p className="relative z-10 text-sm mb-4" style={{ color: '#E24B4A' }}>{error}</p>
          <button
            onClick={handleStart}
            className="relative z-10 px-8 py-2.5 rounded text-sm font-ui cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color: '#c9a84c',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.3)'; }}
          >
            重试
          </button>
        </div>
        {debugPanel}
      </>
    );
  }

  // 开屏
  if (gameMode === 'title_screen') {
    const hasSave = !!loadWorldState();
    return wrapWithCanvas(
      <>
        <div className="h-screen relative flex flex-col items-center justify-center px-4 overflow-hidden">

          {/* 标题 */}
          <div className="relative z-10 stagger-1">
            <h1
              className="font-calligraphy text-4xl mb-3"
              style={{
                color: '#e8e0d0',
                textShadow: '0 0 40px rgba(201, 168, 76, 0.3), 0 0 80px rgba(201, 168, 76, 0.1)',
              }}
            >
              玄武门之变
            </h1>
            {/* 朱砂印章 */}
            <div className="seal-mark absolute" style={{ top: -8, right: -36 }} />
          </div>

          {/* 副标题 */}
          <p
            className="relative z-10 font-game text-sm mb-8 stagger-2"
            style={{ color: '#8a8070', letterSpacing: '0.3em' }}
          >
            武德九年 · 长安
          </p>

          {/* 金色分隔线 */}
          <div
            className="relative z-10 w-48 h-px mb-10 stagger-3"
            style={{ background: 'linear-gradient(to right, transparent, #c9a84c, transparent)' }}
          />

          {/* 按钮组 */}
          <div className="relative z-10 flex flex-col gap-3 stagger-4">
            {hasSave && (
              <button
                onClick={handleContinue}
                className="px-12 py-3 rounded text-sm font-ui cursor-pointer"
                style={{
                  backgroundColor: 'transparent',
                  color: '#e8e0d0',
                  border: '1px solid rgba(201, 168, 76, 0.4)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.7)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 168, 76, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.4)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                继续游戏
              </button>
            )}
            <button
              onClick={handleStart}
              className="px-12 py-3 rounded text-sm font-ui cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                color: hasSave ? '#8a8070' : '#e8e0d0',
                border: `1px solid rgba(201, 168, 76, ${hasSave ? '0.15' : '0.4'})`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.7)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 168, 76, 0.1)';
                e.currentTarget.style.color = '#e8e0d0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `rgba(201, 168, 76, ${hasSave ? '0.15' : '0.4'})`;
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.color = hasSave ? '#8a8070' : '#e8e0d0';
              }}
            >
              {hasSave ? '新游戏' : '开始'}
            </button>
          </div>
        </div>
        {debugPanel}
      </>
    );
  }

  // 日常活动
  if (gameMode === 'daily_activities' && worldState) {
    return wrapWithCanvas(
      <>
        <DailyActivityScreen
          state={worldState}
          onSelectActivity={handleSelectActivity}
          onEndDay={handleEndDay}
          onDeskStateChange={setDeskCanvasState}
        />
        {debugPanel}
      </>
    );
  }

  // 日报
  if (gameMode === 'daily_briefing' && worldState && tickResult) {
    return wrapWithCanvas(
      <>
        <DailyBriefingScreen
          state={worldState}
          tickResult={tickResult}
          hasEvents={worldState.pendingEvents.length > 0}
          onProceed={handleProceedFromBriefing}
        />
        {debugPanel}
      </>
    );
  }

  // 事件场景
  if (gameMode === 'event_scene' && sceneManager && currentSceneConfig) {
    const sceneNpcs = npcs.filter((c) => currentSceneConfig.activeNpcIds?.includes(c.id));
    return wrapWithCanvas(
      <>
        <EventSceneWrapper
          sceneManager={sceneManager}
          scene={currentSceneConfig}
          npcs={sceneNpcs}
          onEnd={handleSceneEnd}
        />
        {debugPanel}
      </>
    );
  }

  // 游戏结束
  if (gameMode === 'game_over') {
    const simulator = simulatorRef.current;
    const ending = simulator?.getEndingType() || 'deposed';
    return wrapWithCanvas(
      <>
        <EndingScreen
          endingType={ending}
          onRestart={handleRestart}
        />
        {debugPanel}
      </>
    );
  }

  return wrapWithCanvas(<>{debugPanel}</>);
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
