import { useState, useEffect, useMemo } from 'react';
import type { SceneManager } from '../engine/sceneManager';
import type { GameState, SceneConfig, Character } from '../types';
import NarratorPanel from './NarratorPanel';
import DialogueFlow from './DialogueFlow';
import ActionPanel from './ActionPanel';
import EndingScreen from './EndingScreen';

interface GameSceneProps {
  sceneManager: SceneManager;
  scene: SceneConfig;
  npcs: Character[];
  onRestart: () => void;
}

export default function GameScene({ sceneManager, scene, npcs, onRestart }: GameSceneProps) {
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

  if (gameState.status === 'ending' && gameState.endingText) {
    return <EndingScreen endingText={gameState.endingText} onRestart={onRestart} />;
  }

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
