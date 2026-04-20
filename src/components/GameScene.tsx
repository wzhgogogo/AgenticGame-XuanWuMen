import { useState, useEffect } from 'react';
import type { GameState, SceneConfig, Character, ISceneManager } from '../types';
import SceneBackground from './SceneBackground';
import DialoguePanel from './DialoguePanel';
import ActionPanel from './ActionPanel';

interface GameSceneProps {
  sceneManager: ISceneManager;
  scene: SceneConfig;
  npcs: Character[];
}

export default function GameScene({ sceneManager, scene, npcs }: GameSceneProps) {
  const [gameState, setGameState] = useState<GameState>(sceneManager.getState());

  useEffect(() => {
    const unsubscribe = sceneManager.subscribe(setGameState);
    return unsubscribe;
  }, [sceneManager]);

  const [thinkingIdx] = useState(() => Math.floor(Math.random() * Math.max(npcs.length, 1)));
  const thinkingText = npcs.length ? npcs[thinkingIdx % npcs.length].waitingText : '';

  return (
    <div className="h-screen relative flex flex-col">
      <SceneBackground phaseIndex={gameState.currentPhaseIndex} />

      {/* 浮动时间/地点标识 */}
      <div className="relative z-10 text-center py-4">
        <span
          className="font-game text-sm"
          style={{ color: '#8a8070', letterSpacing: '0.15em' }}
        >
          {scene.time} · {scene.location}
        </span>
      </div>

      {/* 弹性中间区域 */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-end pb-2">
        <DialoguePanel
          entries={gameState.dialogueHistory}
          isNpcThinking={gameState.isNpcThinking}
          thinkingText={thinkingText}
        />
        <ActionPanel
          suggestedActions={sceneManager.getSuggestedActions()}
          onSubmit={(input) => sceneManager.submitPlayerAction(input)}
          disabled={gameState.isNpcThinking || gameState.status === 'ending'}
        />
      </div>
    </div>
  );
}
