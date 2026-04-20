import type { MemoryEntry } from '../../types';
import type { Character } from '../../types';
import type { LLMProvider } from '../llm/types';
import { extractJson } from '../jsonExtractor';

interface RawMemory {
  characterId: string;
  event: string;
  emotionalTag: string;
  importance: number;
}

export async function extractSceneMemories(
  llmProvider: LLMProvider,
  summary: string,
  involvedNpcIds: string[],
  characters: Character[],
  sceneId: string,
  currentDate: string,
): Promise<Record<string, MemoryEntry[]>> {
  const npcMap = involvedNpcIds
    .map((id) => {
      const c = characters.find((ch) => ch.id === id);
      return c ? `${id}(${c.name})` : null;
    })
    .filter(Boolean)
    .join('、');

  if (!npcMap) return {};

  const prompt = [
    '根据以下场景摘要，为每个相关角色提取1-2条关键记忆（承诺、冲突、情感变化、重要发现）。',
    '',
    `场景摘要：${summary}`,
    `涉及角色：${npcMap}`,
    '',
    '输出JSON，不要输出其他内容：',
    '{"memories":[{"characterId":"角色id","event":"记忆内容(30字内)","emotionalTag":"情绪标签(2-4字)","importance":1到5}]}',
  ].join('\n');

  let fullResponse = '';
  try {
    await llmProvider.chat(
      [
        { role: 'system', content: '你是记忆提取器。只输出JSON。' },
        { role: 'user', content: prompt },
      ],
      (chunk: string) => { fullResponse += chunk; },
    );
  } catch {
    return {};
  }

  try {
    const jsonStr = extractJson(fullResponse);
    if (!jsonStr) return {};

    const parsed = JSON.parse(jsonStr) as { memories?: RawMemory[] };
    if (!Array.isArray(parsed.memories)) return {};

    const result: Record<string, MemoryEntry[]> = {};
    for (const raw of parsed.memories) {
      if (!raw.characterId || !raw.event || !involvedNpcIds.includes(raw.characterId)) continue;
      const entry: MemoryEntry = {
        id: `mem_${sceneId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        date: currentDate,
        event: raw.event,
        emotionalTag: raw.emotionalTag || '复杂',
        importance: Math.max(1, Math.min(5, raw.importance || 3)),
        relatedCharacters: involvedNpcIds.filter((id) => id !== raw.characterId),
        category: 'short_term',
        sceneId,
      };
      if (!result[raw.characterId]) result[raw.characterId] = [];
      result[raw.characterId].push(entry);
    }
    return result;
  } catch {
    return {};
  }
}
