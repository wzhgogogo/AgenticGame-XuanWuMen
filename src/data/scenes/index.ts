import { undercurrent } from './undercurrent';
import { poisonedWine } from './poisonedWine';
import { luoyangDebate } from './luoyangDebate';
import { politicalSiege } from './politicalSiege';
import { taibaiOmen } from './taibaiOmen';
import { midnightCouncil } from './midnightCouncil';

export const scenes = [
  undercurrent,
  poisonedWine,
  luoyangDebate,
  politicalSiege,
  taibaiOmen,
  midnightCouncil,
];

export function getSceneById(id: string) {
  return scenes.find((s) => s.id === id);
}

// MVP 默认场景（单场景模式时使用）
export const defaultScene = midnightCouncil;
