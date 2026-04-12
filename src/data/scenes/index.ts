import { midnightCouncil } from './midnightCouncil';

export const scenes = [midnightCouncil];

export function getSceneById(id: string) {
  return scenes.find((s) => s.id === id);
}

// MVP 默认场景
export const defaultScene = midnightCouncil;
