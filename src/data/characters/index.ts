import type { Character } from '../../types';
import { liShimin } from './liShimin';
import { changSunWuji } from './changSunWuji';
import { weiChiJingDe } from './weiChiJingDe';
import { fangXuanLing } from './fangXuanLing';
import { liJianCheng } from './liJianCheng';
import { liYuanJi } from './liYuanJi';
import { liYuan } from './liYuan';
import { assembleCharacter } from './memoryLoader';

export const characters: Character[] = [
  assembleCharacter(liShimin),
  assembleCharacter(changSunWuji),
  assembleCharacter(weiChiJingDe),
  assembleCharacter(fangXuanLing),
  assembleCharacter(liJianCheng),
  assembleCharacter(liYuanJi),
  assembleCharacter(liYuan),
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
