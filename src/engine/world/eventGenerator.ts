import type {
  EventSkeleton,
  EventInstance,
  PendingEvent,
  WorldState,
} from '../../types/world';
import type { PhaseConfig } from '../../types';
import type { LLMProvider } from '../llm/types';
import { buildEventGenerationPrompt } from './npcPromptBuilder';
import { snapshotPressure } from './pressure';
import { extractJson } from '../jsonExtractor';
import { callLLMWithRetry } from '../llm/retry';
import { combineValidators, forbiddenWordsValidator, jsonValidator } from '../llm/validators';

/**
 * 通过 LLM 为骨架生成具体变体
 */
export async function generateEventInstance(
  skeleton: EventSkeleton,
  worldState: WorldState,
  availableNpcIds: string[],
  llmProvider: LLMProvider,
): Promise<EventInstance | null> {
  const lockedIds = (skeleton.requiredNpcIds ?? []).filter((id) => availableNpcIds.includes(id));
  const prompt = buildEventGenerationPrompt(
    skeleton.category,
    skeleton.description,
    skeleton.constraints,
    skeleton.possibleLocations,
    skeleton.requiredRoles,
    skeleton.phaseSkeletons,
    skeleton.resolution,
    worldState,
    availableNpcIds,
    lockedIds,
  );

  try {
    let fullResponse = '';
    const res = await callLLMWithRetry(
      llmProvider,
      [
        { role: 'system', content: '你是一个历史事件编剧，专注于唐朝武德九年的宫廷政治。请严格按要求输出JSON。' },
        { role: 'user', content: prompt },
      ],
      {
        label: `eventGen:${skeleton.id}`,
        onChunk: (chunk: string) => { fullResponse += chunk; },
        validator: combineValidators(
          forbiddenWordsValidator(),
          jsonValidator((parsed) => {
            const p = parsed as {
              name?: unknown; location?: unknown; narratorIntro?: unknown; phases?: unknown[];
            };
            if (!p.name || !p.location || !p.narratorIntro || !Array.isArray(p.phases)) {
              return '缺少必要字段 name/location/narratorIntro/phases';
            }
            for (const ph of p.phases) {
              const phase = ph as { name?: unknown; turnRange?: unknown; suggestedActions?: unknown };
              if (!phase.name || !phase.turnRange || !phase.suggestedActions) {
                return 'phase 缺少 name/turnRange/suggestedActions';
              }
            }
            return null;
          }),
        ),
      },
    );
    if (!fullResponse) fullResponse = res.content;
    return tryParseEventInstance(fullResponse, skeleton, worldState, availableNpcIds, lockedIds);
  } catch (error) {
    console.warn(`Event generation failed for ${skeleton.id}:`, error);
    return null;
  }
}

function tryParseEventInstance(
  response: string,
  skeleton: EventSkeleton,
  worldState: WorldState,
  availableNpcIds: string[],
  lockedNpcIds: string[] = [],
): EventInstance | null {
  try {
    // 提取 JSON（处理 markdown 包裹）
    const jsonStr = extractJson(response);
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);

    // 校验必须字段
    if (!parsed.name || !parsed.location || !parsed.narratorIntro || !parsed.phases) {
      return null;
    }

    // 校验 phases 结构
    const phases: PhaseConfig[] = [];
    for (let i = 0; i < parsed.phases.length; i++) {
      const p = parsed.phases[i];
      if (!p.name || !p.turnRange || !p.suggestedActions) return null;
      phases.push({
        id: p.id || `phase_${i + 1}`,
        name: p.name,
        turnRange: p.turnRange,
        suggestedActions: p.suggestedActions,
      });
    }

    // 校验 NPC IDs（合并锁定 NPC + LLM 选择，去重）
    const llmChosen: string[] = (parsed.activeNpcIds && parsed.activeNpcIds.length > 0)
      ? parsed.activeNpcIds
      : availableNpcIds.slice(0, 2);
    const activeNpcIds = [...new Set([...lockedNpcIds, ...llmChosen])];

    return {
      skeletonId: skeleton.id,
      name: parsed.name,
      location: parsed.location,
      activeNpcIds,
      narratorIntro: parsed.narratorIntro,
      phases,
      resolution: skeleton.resolution,
      pressureSnapshot: snapshotPressure(worldState.pressureAxes),
      outcomeEffects: [...skeleton.baseOutcomeEffects],
    };
  } catch {
    return null;
  }
}

/**
 * 为 PendingEvent 填充 EventInstance（通过 LLM 或 fallback）
 */
export async function resolveEventInstance(
  _pending: PendingEvent,
  skeleton: EventSkeleton,
  worldState: WorldState,
  availableNpcIds: string[],
  llmProvider: LLMProvider,
  fallbackInstance?: EventInstance,
): Promise<EventInstance> {
  // 先尝试 LLM 生成
  const generated = await generateEventInstance(skeleton, worldState, availableNpcIds, llmProvider);
  if (generated) return generated;

  // 如果有 fallback 变体，使用 fallback
  if (fallbackInstance) {
    return {
      ...fallbackInstance,
      pressureSnapshot: snapshotPressure(worldState.pressureAxes),
    };
  }

  // 最后兜底：用骨架最小信息构建
  const fallbackLockedIds = (skeleton.requiredNpcIds ?? []).filter((id) => availableNpcIds.includes(id));
  return {
    skeletonId: skeleton.id,
    name: skeleton.category,
    location: skeleton.possibleLocations[0] || '秦王府',
    activeNpcIds: [...new Set([...fallbackLockedIds, ...availableNpcIds.slice(0, 2)])],
    narratorIntro: `${skeleton.description}\n\n局势紧迫，事态正在发展...`,
    phases: skeleton.phaseSkeletons.map((ps, i) => ({
      id: `phase_${i + 1}`,
      name: ps.role,
      turnRange: ps.turnRange,
      suggestedActions: ['观察局势', '与幕僚商议', '做出决定'],
    })),
    resolution: skeleton.resolution,
    pressureSnapshot: snapshotPressure(worldState.pressureAxes),
    outcomeEffects: [...skeleton.baseOutcomeEffects],
  };
}
