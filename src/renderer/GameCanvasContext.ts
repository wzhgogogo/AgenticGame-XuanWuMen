import { createContext, useContext } from 'react';
import type { ActivityCategory } from '../types/world';

export type SceneType = 'title' | 'desk' | 'scene' | 'briefing' | 'ending' | 'loading';

export interface DeskObjectState {
  category: ActivityCategory;
  isFocused: boolean;
  isDimmed: boolean;
}

export interface DeskCanvasState {
  timeSlot: 'morning' | 'afternoon' | 'evening';
  objects: DeskObjectState[];
}

export interface CanvasEvent {
  type: 'click_object';
  category: ActivityCategory;
}

export interface GameCanvasContextValue {
  sceneType: SceneType;
  deskState: DeskCanvasState | null;
  scenePhase: number;
  onCanvasEvent: (event: CanvasEvent) => void;
}

export const GameCanvasContext = createContext<GameCanvasContextValue>({
  sceneType: 'title',
  deskState: null,
  scenePhase: 0,
  onCanvasEvent: () => {},
});

export function useGameCanvas() {
  return useContext(GameCanvasContext);
}
