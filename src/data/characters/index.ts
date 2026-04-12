import type { Character } from '../../types';
import { liShimin } from './liShimin';
import { changSunWuji } from './changSunWuji';
import { weiChiJingDe } from './weiChiJingDe';
import { fangXuanLing } from './fangXuanLing';

export const characters: Character[] = [
  liShimin,
  changSunWuji,
  weiChiJingDe,
  fangXuanLing,
];

export function getCharacterById(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

export function getPlayerCharacter(): Character {
  const pc = characters.find((c) => c.role === 'player_character');
  if (!pc) throw new Error('Player character not found');
  return pc;
}

export function getNpcCharacters(): Character[] {
  return characters.filter((c) => c.role !== 'player_character');
}
