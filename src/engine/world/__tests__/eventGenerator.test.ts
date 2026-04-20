import { describe, it, expect, vi } from 'vitest';
import { generateEventInstance, resolveEventInstance } from '../eventGenerator';
import { createInitialWorldState } from '../worldState';
import { snapshotPressure } from '../pressure';
import { banquetCrisis } from '../../../data/skeletons';
import type { LLMProvider } from '../../llm/types';
import type { EventInstance, PendingEvent } from '../../../types/world';

const VALID_LLM_RESPONSE = JSON.stringify({
  name: '东宫夜宴',
  location: '太极殿',
  activeNpcIds: ['weichi_jingde'],
  narratorIntro: '夜色渐深，太极殿中灯火通明。秦王步入殿门，一股酒香扑面而来。',
  phases: [
    { id: 'phase_1', name: '入局', turnRange: [1, 3], suggestedActions: ['观察', '寒暄', '警觉'] },
  ],
});

const AVAILABLE_NPCS = ['weichi_jingde', 'changsun_wuji', 'fang_xuanling'];

function makeSuccessLlm(response: string = VALID_LLM_RESPONSE): LLMProvider {
  return {
    chat: vi.fn(async (_msgs, onChunk) => {
      onChunk?.(response);
      return { content: response };
    }),
  };
}

function makeGarbageLlm(): LLMProvider {
  return {
    chat: vi.fn(async () => ({ content: 'this is not json at all' })),
  };
}

function makeErrorLlm(): LLMProvider {
  return {
    chat: vi.fn(async () => { throw new Error('network error'); }),
  };
}

// ===== generateEventInstance =====

describe('generateEventInstance', () => {
  it('returns EventInstance on valid LLM response', async () => {
    const state = createInitialWorldState();
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, makeSuccessLlm());
    expect(result).not.toBeNull();
    expect(result!.skeletonId).toBe(banquetCrisis.id);
    expect(result!.name).toBe('东宫夜宴');
    expect(result!.location).toBe('太极殿');
    expect(result!.phases).toHaveLength(1);
    expect(result!.phases[0].name).toBe('入局');
  });

  it('falls back to availableNpcIds when activeNpcIds is missing', async () => {
    const noNpcResponse = JSON.stringify({
      name: '东宫夜宴',
      location: '太极殿',
      narratorIntro: '旁白文字',
      phases: [{ name: '入局', turnRange: [1, 3], suggestedActions: ['观察'] }],
    });
    const state = createInitialWorldState();
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, makeSuccessLlm(noNpcResponse));
    expect(result).not.toBeNull();
    expect(result!.activeNpcIds).toEqual(['weichi_jingde', 'changsun_wuji']);
  });

  it('auto-generates phase id when missing', async () => {
    const noPidResponse = JSON.stringify({
      name: '东宫夜宴',
      location: '太极殿',
      activeNpcIds: ['weichi_jingde'],
      narratorIntro: '旁白',
      phases: [{ name: '第一阶段', turnRange: [1, 3], suggestedActions: ['观察'] }],
    });
    const state = createInitialWorldState();
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, makeSuccessLlm(noPidResponse));
    expect(result!.phases[0].id).toBe('phase_1');
  });

  it('retries once then returns null on garbage response', async () => {
    const state = createInitialWorldState();
    const llm = makeGarbageLlm();
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, llm);
    expect(result).toBeNull();
    expect(llm.chat).toHaveBeenCalledTimes(2);
  });

  it('returns null on LLM exception', async () => {
    const state = createInitialWorldState();
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, makeErrorLlm());
    expect(result).toBeNull();
  });

  it('calls LLM with system and user messages', async () => {
    const state = createInitialWorldState();
    const llm = makeSuccessLlm();
    await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, llm);
    const callArgs = (llm.chat as ReturnType<typeof vi.fn>).mock.calls[0];
    const messages = callArgs[0];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('uses res.content fallback when onChunk is not called', async () => {
    const llm: LLMProvider = {
      chat: vi.fn(async () => ({ content: VALID_LLM_RESPONSE })),
    };
    const state = createInitialWorldState();
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, llm);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('东宫夜宴');
  });

  it('returns null when required fields are missing', async () => {
    const incomplete = JSON.stringify({ name: '事件', location: '地点' }); // missing narratorIntro, phases
    const state = createInitialWorldState();
    const llm = makeGarbageLlm();
    (llm.chat as ReturnType<typeof vi.fn>).mockResolvedValue({ content: incomplete });
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, llm);
    expect(result).toBeNull();
  });

  it('copies resolution and baseOutcomeEffects from skeleton', async () => {
    const state = createInitialWorldState();
    const result = await generateEventInstance(banquetCrisis, state, AVAILABLE_NPCS, makeSuccessLlm());
    expect(result!.resolution).toEqual(banquetCrisis.resolution);
    expect(result!.outcomeEffects).toEqual(banquetCrisis.baseOutcomeEffects);
  });
});

// ===== resolveEventInstance =====

describe('resolveEventInstance', () => {
  const pending: PendingEvent = {
    skeletonId: banquetCrisis.id,
    triggeredOnDay: 10,
    pressureSnapshot: snapshotPressure(createInitialWorldState().pressureAxes),
  };

  it('returns LLM-generated instance on success', async () => {
    const state = createInitialWorldState();
    const result = await resolveEventInstance(pending, banquetCrisis, state, AVAILABLE_NPCS, makeSuccessLlm());
    expect(result.name).toBe('东宫夜宴');
  });

  it('returns fallbackInstance when LLM fails', async () => {
    const state = createInitialWorldState();
    const fallback: EventInstance = {
      skeletonId: banquetCrisis.id,
      name: '兜底事件',
      location: '秦王府',
      activeNpcIds: ['weichi_jingde'],
      narratorIntro: '兜底旁白',
      phases: [{ id: 'p1', name: '阶段1', turnRange: [1, 3], suggestedActions: ['行动'] }],
      resolution: banquetCrisis.resolution,
      pressureSnapshot: snapshotPressure(createInitialWorldState().pressureAxes),
      outcomeEffects: [],
    };
    const result = await resolveEventInstance(pending, banquetCrisis, state, AVAILABLE_NPCS, makeGarbageLlm(), fallback);
    expect(result.name).toBe('兜底事件');
  });

  it('returns hard fallback from skeleton when LLM fails and no fallback', async () => {
    const state = createInitialWorldState();
    const result = await resolveEventInstance(pending, banquetCrisis, state, AVAILABLE_NPCS, makeGarbageLlm());
    expect(result.skeletonId).toBe(banquetCrisis.id);
    expect(result.name).toBe(banquetCrisis.category);
    expect(result.phases.length).toBe(banquetCrisis.phaseSkeletons.length);
  });

  it('hard fallback uses default suggestedActions', async () => {
    const state = createInitialWorldState();
    const result = await resolveEventInstance(pending, banquetCrisis, state, AVAILABLE_NPCS, makeErrorLlm());
    for (const phase of result.phases) {
      expect(phase.suggestedActions).toEqual(['观察局势', '与幕僚商议', '做出决定']);
    }
  });

  it('hard fallback location uses first possibleLocation', async () => {
    const state = createInitialWorldState();
    const result = await resolveEventInstance(pending, banquetCrisis, state, AVAILABLE_NPCS, makeErrorLlm());
    expect(result.location).toBe(banquetCrisis.possibleLocations[0]);
  });
});
