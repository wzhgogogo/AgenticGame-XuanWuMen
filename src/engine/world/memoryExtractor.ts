import type { MemoryEntry } from '../../types';
import type { Character } from '../../types';
import type { LLMProvider } from '../llm/types';
import { callLLMWithRetry } from '../llm/retry';
import { combineValidators, forbiddenWordsValidator, jsonValidator } from '../llm/validators';
import { extractJson } from '../jsonExtractor';

interface RawMemory {
  characterId: string;
  event: string;
  emotionalTag: string;
  importance: number;
}

interface RawRelationshipDelta {
  from: string;
  to: string;
  trustDelta: number;
  reason: string;
}

export interface RelationshipDelta {
  from: string;
  to: string;
  trustDelta: number;   // clamp -10..+10
  reason: string;       // <=15 字
}

export interface SceneExtractionResult {
  memories: Record<string, MemoryEntry[]>;
  relationshipDeltas: RelationshipDelta[];
}

export async function extractSceneMemories(
  llmProvider: LLMProvider,
  summary: string,
  involvedNpcIds: string[],
  characters: Character[],
  sceneId: string,
  currentDate: string,
): Promise<SceneExtractionResult> {
  const npcMap = involvedNpcIds
    .map((id) => {
      const c = characters.find((ch) => ch.id === id);
      return c ? `${id}(${c.name})` : null;
    })
    .filter(Boolean)
    .join('、');

  if (!npcMap) return { memories: {}, relationshipDeltas: [] };

  const prompt = [
    '根据以下场景摘要，为每个相关角色提取 1-2 条关键记忆；',
    '同时识别本场景中角色间的信任度变化（可选，若无明显变化可留空）。',
    '',
    `场景摘要：${summary}`,
    `涉及角色：${npcMap}`,
    '',
    '输出严格 JSON（不要输出其他内容）：',
    '{',
    '  "memories": [',
    '    {"characterId":"角色id","event":"记忆内容(30字内)","emotionalTag":"情绪标签(2-4字)","importance":1到5}',
    '  ],',
    '  "relationshipDeltas": [',
    '    {"from":"fromId","to":"toId","trustDelta":-10到+10的整数,"reason":"变化原因(15字内)"}',
    '  ]',
    '}',
    '',
    '说明：',
    '- trustDelta 正数表示信任增强，负数表示信任减弱；',
    '- 只输出确实有明显关系变化的，没有变化就不要硬编；',
    '- from 和 to 都必须是 involvedNpcIds 里的角色；',
    '- 一个方向最多一条（同方向多条合并）。',
  ].join('\n');

  let fullResponse = '';
  try {
    const res = await callLLMWithRetry(
      llmProvider,
      [
        { role: 'system', content: '你是记忆与关系提取器。只输出 JSON。' },
        { role: 'user', content: prompt },
      ],
      {
        label: 'memoryExtractor',
        onChunk: (chunk: string) => { fullResponse += chunk; },
        validator: combineValidators(
          forbiddenWordsValidator(),
          jsonValidator((parsed) => {
            const p = parsed as { memories?: unknown; relationshipDeltas?: unknown };
            // 至少一个数组存在（可以为空数组）
            if (!Array.isArray(p.memories) && !Array.isArray(p.relationshipDeltas)) {
              return '缺少 memories 或 relationshipDeltas 数组';
            }
            return null;
          }),
        ),
      },
    );
    if (!fullResponse) fullResponse = res.content;
  } catch {
    return { memories: {}, relationshipDeltas: [] };
  }

  try {
    const jsonStr = extractJson(fullResponse);
    if (!jsonStr) return { memories: {}, relationshipDeltas: [] };

    const parsed = JSON.parse(jsonStr) as {
      memories?: RawMemory[];
      relationshipDeltas?: RawRelationshipDelta[];
    };

    // --- 记忆解析 ---
    const memories: Record<string, MemoryEntry[]> = {};
    if (Array.isArray(parsed.memories)) {
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
        if (!memories[raw.characterId]) memories[raw.characterId] = [];
        memories[raw.characterId].push(entry);
      }
    }

    // --- 关系 delta 解析 ---
    const relationshipDeltas: RelationshipDelta[] = [];
    if (Array.isArray(parsed.relationshipDeltas)) {
      for (const raw of parsed.relationshipDeltas) {
        if (!raw.from || !raw.to || raw.from === raw.to) continue;
        if (!involvedNpcIds.includes(raw.from) || !involvedNpcIds.includes(raw.to)) continue;
        const delta = Math.max(-10, Math.min(10, Math.round(Number(raw.trustDelta) || 0)));
        if (delta === 0) continue;
        const reason = (raw.reason || '').toString().slice(0, 20);
        relationshipDeltas.push({ from: raw.from, to: raw.to, trustDelta: delta, reason });
      }
    }

    return { memories, relationshipDeltas };
  } catch {
    return { memories: {}, relationshipDeltas: [] };
  }
}

/**
 * 从记忆数组中挑选最相关的一组：保底最新 N 条 + 剩余名额按 importance 降序
 * 输出按时间升序，保持时间线直觉
 */
export function selectMemories(
  memories: MemoryEntry[] | undefined,
  options: { topK?: number; recentGuaranteed?: number } = {},
): MemoryEntry[] {
  if (!memories || memories.length === 0) return [];
  const { topK = 5, recentGuaranteed = 1 } = options;
  if (memories.length <= topK) {
    return [...memories].sort((a, b) => a.date.localeCompare(b.date));
  }

  const recent = memories.slice(-recentGuaranteed);
  const recentIds = new Set(recent.map((m) => m.id));

  const rest = memories
    .filter((m) => !recentIds.has(m.id))
    .sort((a, b) => (b.importance - a.importance) || b.date.localeCompare(a.date));

  const remainingSlots = Math.max(0, topK - recent.length);
  const picked = [...recent, ...rest.slice(0, remainingSlots)];
  return picked.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 把一批旧记忆压缩为 2-4 句摘要，追加到角色的长期记忆文本中。
 * best-effort：失败时返回 existingSummary 原样。
 */
export async function summarizeOldMemories(
  llmProvider: LLMProvider,
  characterName: string,
  oldMemories: MemoryEntry[],
  existingSummary: string,
): Promise<string> {
  if (oldMemories.length === 0) return existingSummary;

  const memoText = oldMemories
    .map((m) => `[${m.date} · ${m.emotionalTag} · 重要度${m.importance}] ${m.event}`)
    .join('\n');

  const prompt = [
    `将${characterName}以下若干条旧记忆提炼为 2-4 句凝练叙述，保留关键事实、情感走向、与他人关系变化，去掉琐碎细节。`,
    '',
    existingSummary ? `已有长期记忆（保留并可补充，不要重复）：\n${existingSummary}\n` : '',
    '待压缩的旧记忆：',
    memoText,
    '',
    '直接输出 2-4 句中文叙述，第三人称，不加标题不加编号，不要 JSON，不超过 120 字。',
  ].join('\n');

  let fullResponse = '';
  try {
    const res = await callLLMWithRetry(
      llmProvider,
      [
        { role: 'system', content: '你是历史人物记忆的提炼者。只输出纯文本叙述，不加标记。' },
        { role: 'user', content: prompt },
      ],
      {
        label: 'summarizeOldMemories',
        onChunk: (chunk: string) => { fullResponse += chunk; },
        validator: forbiddenWordsValidator(),
      },
    );
    if (!fullResponse) fullResponse = res.content;
  } catch {
    return existingSummary;
  }

  const cleaned = fullResponse.trim().replace(/^[【[].*?[】\]]\s*/, '');
  if (!cleaned) return existingSummary;

  // 追加到已有摘要（用分号分隔，避免无限增长则在上层约束）
  return existingSummary
    ? `${existingSummary}\n${cleaned}`
    : cleaned;
}
