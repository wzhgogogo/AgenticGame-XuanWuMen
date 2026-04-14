import { useState, useEffect, useMemo } from 'react';
import type { GameState, SceneConfig, Character, ISceneManager } from '../types';
import NarratorPanel from './NarratorPanel';
import DialogueFlow from './DialogueFlow';
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

  const thinkingText = useMemo(() => {
    if (!npcs.length) return '';
    const idx = Math.floor(Math.random() * npcs.length);
    return npcs[idx].waitingText;
  }, [npcs, gameState.isNpcThinking]);

  return (
    <div className="h-screen flex flex-col">
      <NarratorPanel time={scene.time} location={scene.location} />
      <DialogueFlow
        entries={gameState.dialogueHistory}
        isNpcThinking={gameState.isNpcThinking}
        thinkingText={thinkingText}
      />
      <ActionPanel
        suggestedActions={sceneManager.getSuggestedActions()}
        onSubmit={(input) => sceneManager.submitPlayerAction(input)}
        disabled={gameState.isNpcThinking}
      />
    </div>
  );
}
