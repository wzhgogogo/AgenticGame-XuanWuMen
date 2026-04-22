import { describe, it, expect } from 'vitest';
import { buildNpcDecisionPrompt, buildEventGenerationPrompt } from '../npcPromptBuilder';
import { createInitialWorldState } from '../worldState';
import { NPC_IMPACT_PROFILES } from '../../../data/agents/npcDecisionRules';
import type { NpcAgentState, NpcStance } from '../../../types/world';

function makeAgent(overrides: Partial<NpcAgentState> = {}): NpcAgentState {
  return {
    characterId: 'weichi_jingde',
    patience: 60,
    commitment: 70,
    alertness: 50,
    currentPlan: null,
    recentActions: [],
    daysSinceLastAction: 3,
    ...overrides,
  };
}

const DEFAULT_STANCES: NpcStance[] = ['observe', 'advise', 'pressure'];

// ===== buildNpcDecisionPrompt =====

describe('buildNpcDecisionPrompt', () => {
  it('returns a non-empty string', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), DEFAULT_STANCES, state);
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes character name', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), DEFAULT_STANCES, state);
    expect(result).toContain('尉迟敬德');
  });

  it('includes pressure axis labels', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), DEFAULT_STANCES, state);
    expect(result).toContain('储位之争');
  });

  it('includes patience and commitment values', () => {
    const agent = makeAgent({ patience: 42, commitment: 88 });
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', agent, DEFAULT_STANCES, state);
    expect(result).toContain('42');
    expect(result).toContain('88');
  });

  it('includes allowed stance keys and their Chinese labels', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), ['drill', 'scheme'], state);
    expect(result).toContain('drill');
    expect(result).toContain('scheme');
    expect(result).toContain('练兵备战');
    expect(result).toContain('对内串联');
  });

  it('includes JSON output schema with stance/action/pressureDeltas', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), DEFAULT_STANCES, state);
    expect(result).toContain('"stance"');
    expect(result).toContain('"action"');
    expect(result).toContain('"pressureDeltas"');
  });

  it('includes currentPlan when set', () => {
    const agent = makeAgent({ currentPlan: '联络房玄龄' });
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', agent, DEFAULT_STANCES, state);
    expect(result).toContain('联络房玄龄');
  });

  it('includes recent events from eventLog', () => {
    const state = createInitialWorldState();
    state.eventLog.push({
      instanceId: 'evt1', skeletonId: 'sk1', name: '太极殿冲突', day: 3,
      summary: '发生了激烈争论', pressureEffects: [],
    });
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), DEFAULT_STANCES, state);
    expect(result).toContain('太极殿冲突');
  });

  it('includes escalation hints when provided', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), DEFAULT_STANCES, state, {
      escalationHints: ['敬德心中焦躁'],
    });
    expect(result).toContain('敬德心中焦躁');
  });

  it('includes impact whitelist when provided', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('weichi_jingde', '尉迟敬德', makeAgent(), DEFAULT_STANCES, state, {
      impactWhitelist: ['military_readiness', 'qinwangfu_desperation'],
    });
    expect(result).toContain('military_readiness');
    expect(result).toContain('qinwangfu_desperation');
  });

  it('shows English axisId in world state display', () => {
    const state = createInitialWorldState();
    const result = buildNpcDecisionPrompt('changsun_wuji', '长孙无忌', makeAgent(), DEFAULT_STANCES, state);
    expect(result).toContain('succession_crisis');
    expect(result).toContain('military_readiness');
  });
});

// ===== buildEventGenerationPrompt =====

describe('buildEventGenerationPrompt', () => {
  const defaultArgs = {
    category: '宴会危局',
    description: '敌对方设宴款待秦王',
    constraints: ['不能出现武器'],
    locations: ['太极殿', '东宫'],
    roles: ['李建成'],
    phases: [{ role: '入局', description: '赴宴', turnRange: [1, 3] as [number, number] }],
    resolution: { coreConflict: '能否安全脱身', resolutionSignals: ['秦王离开宴席'] },
    npcIds: ['weichi_jingde', 'changsun_wuji'],
  };

  it('returns a non-empty string', () => {
    const state = createInitialWorldState();
    const result = buildEventGenerationPrompt(
      defaultArgs.category, defaultArgs.description, defaultArgs.constraints,
      defaultArgs.locations, defaultArgs.roles, defaultArgs.phases,
      defaultArgs.resolution, state, defaultArgs.npcIds,
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes skeleton category and description', () => {
    const state = createInitialWorldState();
    const result = buildEventGenerationPrompt(
      defaultArgs.category, defaultArgs.description, defaultArgs.constraints,
      defaultArgs.locations, defaultArgs.roles, defaultArgs.phases,
      defaultArgs.resolution, state, defaultArgs.npcIds,
    );
    expect(result).toContain('宴会危局');
    expect(result).toContain('敌对方设宴款待秦王');
  });

  it('includes constraints', () => {
    const state = createInitialWorldState();
    const result = buildEventGenerationPrompt(
      defaultArgs.category, defaultArgs.description, defaultArgs.constraints,
      defaultArgs.locations, defaultArgs.roles, defaultArgs.phases,
      defaultArgs.resolution, state, defaultArgs.npcIds,
    );
    expect(result).toContain('不能出现武器');
  });

  it('includes locations and roles', () => {
    const state = createInitialWorldState();
    const result = buildEventGenerationPrompt(
      defaultArgs.category, defaultArgs.description, defaultArgs.constraints,
      defaultArgs.locations, defaultArgs.roles, defaultArgs.phases,
      defaultArgs.resolution, state, defaultArgs.npcIds,
    );
    expect(result).toContain('太极殿');
    expect(result).toContain('李建成');
  });

  it('includes resolution coreConflict and signals', () => {
    const state = createInitialWorldState();
    const result = buildEventGenerationPrompt(
      defaultArgs.category, defaultArgs.description, defaultArgs.constraints,
      defaultArgs.locations, defaultArgs.roles, defaultArgs.phases,
      defaultArgs.resolution, state, defaultArgs.npcIds,
    );
    expect(result).toContain('能否安全脱身');
    expect(result).toContain('秦王离开宴席');
  });

  it('includes JSON output format with required fields', () => {
    const state = createInitialWorldState();
    const result = buildEventGenerationPrompt(
      defaultArgs.category, defaultArgs.description, defaultArgs.constraints,
      defaultArgs.locations, defaultArgs.roles, defaultArgs.phases,
      defaultArgs.resolution, state, defaultArgs.npcIds,
    );
    expect(result).toContain('"name"');
    expect(result).toContain('"location"');
    expect(result).toContain('"phases"');
    expect(result).toContain('"narratorIntro"');
  });
});

// ===== NPC_IMPACT_PROFILES whitelist content =====

describe('NPC_IMPACT_PROFILES', () => {

  it('changsun_wuji whitelist covers political axes', () => {
    const wl = NPC_IMPACT_PROFILES.changsun_wuji.whitelist;
    expect(wl).toContain('court_opinion');
    expect(wl).toContain('succession_crisis');
    expect(wl).toContain('jiancheng_hostility');
    expect(wl).not.toContain('military_readiness');
  });

  it('weichi_jingde whitelist covers military + hostility axes', () => {
    const wl = NPC_IMPACT_PROFILES.weichi_jingde.whitelist;
    expect(wl).toContain('military_readiness');
    expect(wl).toContain('qinwangfu_desperation');
    expect(wl).toContain('imperial_suspicion');
    expect(wl).toContain('jiancheng_hostility');
    expect(wl).not.toContain('court_opinion');
  });

  it('fang_xuanling whitelist covers strategic axes', () => {
    const wl = NPC_IMPACT_PROFILES.fang_xuanling.whitelist;
    expect(wl).toContain('succession_crisis');
    expect(wl).toContain('qinwangfu_desperation');
    expect(wl).toContain('court_opinion');
    expect(wl).not.toContain('military_readiness');
  });
});
