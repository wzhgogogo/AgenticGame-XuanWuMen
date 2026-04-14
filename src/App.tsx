import { useState, useRef, useCallback } from 'react';
import type { LLMConfig, CampaignState, SceneConfig, Character } from './types';
import { createLLMProvider } from './engine/llm';
import { SceneManager } from './engine/sceneManager';
import { CampaignManager } from './engine/campaignManager';
import { scenes } from './data/scenes';
import { defaultTimeline, transitions } from './data/timelines';
import { characters, getPlayerCharacter, getNpcCharacters } from './data/characters';
import GameScene from './components/GameScene';
import TransitionScreen from './components/TransitionScreen';
import EndingScreen from './components/EndingScreen';

function loadEnvConfig(): LLMConfig {
  return {
    provider: import.meta.env.VITE_LLM_PROVIDER || 'openai',
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
    model: import.meta.env.VITE_LLM_MODEL || '',
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || undefined,
  };
}

export default function App() {
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const campaignRef = useRef<CampaignManager | null>(null);

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

      // SceneManager 工厂：CampaignManager 通过此创建每个场景的管理器
      const factory = (scene: SceneConfig, sceneNpcs: Character[], scenePlayer: Character, summary?: string) =>
        new SceneManager(provider, scene, sceneNpcs, scenePlayer, summary);

      const campaign = new CampaignManager(
        defaultTimeline,
        scenes,
        transitions,
        factory,
        characters,
        player,
      );
      campaignRef.current = campaign;
      campaign.subscribe(setCampaignState);
      await campaign.startCampaign();
    } catch (e) {
      setError(e instanceof Error ? e.message : '启动失败');
    }
  }, [player, npcs]);

  const handleRestart = useCallback(async () => {
    setCampaignState(null);
    campaignRef.current = null;
    await handleStart();
  }, [handleStart]);

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
  if (!campaignState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="font-game text-2xl mb-2" style={{ color: '#e8e0d0' }}>
          玄武门之变
        </h1>
        <p className="text-sm mb-8" style={{ color: '#8a8070' }}>
          武德九年 · 长安
        </p>
        <button
          onClick={handleStart}
          className="px-8 py-3 rounded-sm text-sm font-ui cursor-pointer transition-colors"
          style={{ backgroundColor: '#2a2a34', color: '#e8e0d0' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a44'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2a2a34'; }}
        >
          开始
        </button>
      </div>
    );
  }

  const campaign = campaignRef.current!;

  // 场景过渡画面
  if (campaignState.status === 'transitioning') {
    const lastOutcome = campaignState.completedScenes[campaignState.completedScenes.length - 1];
    const transition = campaign.getTransitionToNext();
    return (
      <TransitionScreen
        endingText={lastOutcome?.summary || ''}
        transitionText={transition?.transitionNarration || ''}
        onContinue={() => campaign.advanceToNextScene()}
      />
    );
  }

  // 全部完成
  if (campaignState.status === 'completed') {
    const lastOutcome = campaignState.completedScenes[campaignState.completedScenes.length - 1];
    return (
      <EndingScreen
        endingText={lastOutcome?.summary || '故事结束。'}
        onRestart={handleRestart}
      />
    );
  }

  // 游戏中
  const sceneManager = campaign.getCurrentSceneManager();
  const currentScene = campaign.getCurrentScene();
  if (sceneManager && currentScene) {
    const sceneNpcs = npcs.filter((c) => currentScene.activeNpcIds.includes(c.id));
    return (
      <GameScene
        sceneManager={sceneManager}
        scene={currentScene}
        npcs={sceneNpcs}
      />
    );
  }

  return null;
}
