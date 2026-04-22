import { describe, it, expect } from 'vitest';
import { tickNpcAgent, filterPlausibleActions, recordNpcAction, adjustPatience, consumeOnceRule } from '../npcAgent';
import { createInitialWorldState } from '../worldState';
import type { NpcAgentState, NpcAction, NpcDecisionRule } from '../../../types/world';
import type { Character } from '../../../types';

// --- helpers ---

function makeAgent(overrides: Partial<NpcAgentState> = {}): NpcAgentState {
  return {
    characterId: 'test_npc',
    patience: 50,
    alertness: 50,
    commitment: 70,
    currentPlan: null,
    recentActions: [],
    daysSinceLastAction: 3,
    ...overrides,
  };
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test_npc',
    name: '测试角色',
    title: '测试',
    age: 30,
    faction: 'qinwangfu',
    role: 'npc_core',
    color: '#aaa',
    waitingText: '...',
    identity: {
      bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
      speechStyle: '测试风格',
      speechPatterns: [],
      psychologicalCore: '测试',
      skills: [],
    },
    relationships: {
      li_shimin: { role: '主公', trust: 90, dynamics: 'test', tension: 'test' },
    },
    goals: { publicGoal: '', privateGoal: '', bottomLine: '' },
    foundationalMemory: [],
    shortTermMemory: [],
    reflections: [],
    ...overrides,
  } as Character;
}

function makeAction(overrides: Partial<NpcAction> = {}): NpcAction {
  return {
    characterId: 'test_npc',
    stance: 'observe',
    action: '按兵不动',
    description: 'test',
    pressureEffects: [],
    ...overrides,
  };
}

// --- tickNpcAgent ---

describe('tickNpcAgent', () => {
  it('decrements patience by decay rate', () => {
    const agent = makeAgent({ patience: 50 });
    const result = tickNpcAgent(agent, 2);
    expect(result.patience).toBe(48);
  });

  it('increments daysSinceLastAction', () => {
    const agent = makeAgent({ daysSinceLastAction: 5 });
    const result = tickNpcAgent(agent, 1);
    expect(result.daysSinceLastAction).toBe(6);
  });

  it('clamps patience to 0', () => {
    const agent = makeAgent({ patience: 1 });
    const result = tickNpcAgent(agent, 10);
    expect(result.patience).toBe(0);
  });

  it('is pure — does not mutate input', () => {
    const agent = makeAgent();
    const original = { ...agent };
    tickNpcAgent(agent, 2);
    expect(agent.patience).toBe(original.patience);
  });
});

// --- recordNpcAction ---

describe('recordNpcAction', () => {
  it('adds action to recentActions', () => {
    const agent = makeAgent({ recentActions: [] });
    const result = recordNpcAction(agent, makeAction({ stance: 'advise' }));
    expect(result.recentActions).toHaveLength(1);
    expect(result.recentActions[0].stance).toBe('advise');
  });

  it('resets daysSinceLastAction to 0', () => {
    const agent = makeAgent({ daysSinceLastAction: 10 });
    const result = recordNpcAction(agent, makeAction());
    expect(result.daysSinceLastAction).toBe(0);
  });

  it('keeps at most 5 recent actions', () => {
    const actions: NpcAction[] = Array.from({ length: 5 }, (_, i) =>
      makeAction({ description: `action_${i}` }),
    );
    const agent = makeAgent({ recentActions: actions });
    const result = recordNpcAction(agent, makeAction({ stance: 'pressure', description: 'new' }));
    expect(result.recentActions).toHaveLength(5);
    expect(result.recentActions[4].stance).toBe('pressure');
    expect(result.recentActions[0].description).toBe('action_1');
  });
});

// --- adjustPatience ---

describe('adjustPatience', () => {
  it('increases patience', () => {
    const agent = makeAgent({ patience: 50 });
    expect(adjustPatience(agent, 10).patience).toBe(60);
  });

  it('decreases patience', () => {
    const agent = makeAgent({ patience: 50 });
    expect(adjustPatience(agent, -20).patience).toBe(30);
  });

  it('clamps to 0', () => {
    expect(adjustPatience(makeAgent({ patience: 5 }), -20).patience).toBe(0);
  });

  it('clamps to 100', () => {
    expect(adjustPatience(makeAgent({ patience: 95 }), 20).patience).toBe(100);
  });
});

// --- filterPlausibleActions ---

describe('filterPlausibleActions', () => {
  it('returns observe when no rules match', () => {
    const agent = makeAgent({ patience: 80 });
    const rules: NpcDecisionRule[] = [
      { id: 'r1', conditions: { patienceBelow: 30 }, allowedStances: ['pressure'] },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.allowedStances).toEqual(['observe']);
  });

  it('matches patienceBelow condition', () => {
    const agent = makeAgent({ patience: 20 });
    const rules: NpcDecisionRule[] = [
      { id: 'r1', conditions: { patienceBelow: 30 }, allowedStances: ['pressure', 'drill'] },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.allowedStances).toContain('pressure');
    expect(result.allowedStances).toContain('drill');
  });

  it('matches pressureAbove condition', () => {
    const agent = makeAgent();
    const rules: NpcDecisionRule[] = [
      { id: 'r1', conditions: { pressureAbove: { succession_crisis: 40 } }, allowedStances: ['scheme'] },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.allowedStances).toContain('scheme');
  });

  it('does not match pressureAbove when below threshold', () => {
    const agent = makeAgent();
    const rules: NpcDecisionRule[] = [
      { id: 'r1', conditions: { pressureAbove: { succession_crisis: 90 } }, allowedStances: ['scheme'] },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.allowedStances).toEqual(['observe']);
  });

  it('collects escalationHints from matched rules', () => {
    const agent = makeAgent({ patience: 10 });
    const rules: NpcDecisionRule[] = [
      {
        id: 'r1',
        conditions: { patienceBelow: 20 },
        allowedStances: ['pressure'],
        escalationHint: '耐心告罄',
      },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.escalationHints).toContain('耐心告罄');
  });

  it('returns triggerEvent from matched rule', () => {
    const agent = makeAgent({ patience: 5 });
    const rules: NpcDecisionRule[] = [
      { id: 'r1', conditions: { patienceBelow: 10 }, allowedStances: ['pressure'], triggerEvent: 'skeleton_ultimatum' },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.triggerEvent).toBe('skeleton_ultimatum');
  });

  it('deduplicates stances across multiple rules', () => {
    const agent = makeAgent({ patience: 10, daysSinceLastAction: 5 });
    const rules: NpcDecisionRule[] = [
      { id: 'r1', conditions: { patienceBelow: 20 }, allowedStances: ['pressure', 'advise'] },
      { id: 'r2', conditions: { daysSinceLastActionAbove: 3 }, allowedStances: ['pressure', 'scheme'] },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    const pressureCount = result.allowedStances.filter((s) => s === 'pressure').length;
    expect(pressureCount).toBe(1);
    expect(result.allowedStances).toContain('advise');
    expect(result.allowedStances).toContain('scheme');
  });

  it('matches relationshipBelow condition', () => {
    const agent = makeAgent();
    const char = makeCharacter({
      relationships: {
        li_shimin: { role: '主公', trust: 30, dynamics: '', tension: '' },
      },
    });
    const rules: NpcDecisionRule[] = [
      {
        id: 'r1',
        conditions: { relationshipBelow: { targetId: 'li_shimin', trust: 50 } },
        allowedStances: ['abandon'],
      },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), char);
    expect(result.allowedStances).toContain('abandon');
  });

  it('skips once rules that have been consumed', () => {
    const agent = makeAgent({ patience: 5, consumedOnceRules: ['r_once'] });
    const rules: NpcDecisionRule[] = [
      {
        id: 'r_once',
        conditions: { patienceBelow: 10 },
        allowedStances: ['breakdown'],
        once: true,
      },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.allowedStances).not.toContain('breakdown');
  });

  it('reports onceRuleIds for matched once rules', () => {
    const agent = makeAgent({ patience: 5 });
    const rules: NpcDecisionRule[] = [
      { id: 'r_once', conditions: { patienceBelow: 10 }, allowedStances: ['breakdown'], once: true },
    ];
    const result = filterPlausibleActions(agent, rules, createInitialWorldState(), makeCharacter());
    expect(result.onceRuleIds).toEqual(['r_once']);
  });
});

// --- consumeOnceRule ---

describe('consumeOnceRule', () => {
  it('appends ruleId to consumedOnceRules', () => {
    const agent = makeAgent();
    const result = consumeOnceRule(agent, 'r_once');
    expect(result.consumedOnceRules).toEqual(['r_once']);
  });

  it('does not duplicate existing ruleId', () => {
    const agent = makeAgent({ consumedOnceRules: ['r_once'] });
    const result = consumeOnceRule(agent, 'r_once');
    expect(result.consumedOnceRules).toEqual(['r_once']);
  });
});
