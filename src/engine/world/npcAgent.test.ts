import { describe, it, expect } from 'vitest';
import { tickNpcAgent, filterPlausibleActions, recordNpcAction, adjustPatience } from './npcAgent';
import { createInitialWorldState } from './worldState';
import type { NpcAgentState, NpcAction, NpcDecisionRule } from '../../types/world';
import type { Character } from '../../types';

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
    const action: NpcAction = {
      characterId: 'test_npc',
      actionType: 'lobby',
      description: 'test',
      pressureEffects: [],
    };
    const result = recordNpcAction(agent, action);
    expect(result.recentActions).toHaveLength(1);
    expect(result.recentActions[0].actionType).toBe('lobby');
  });

  it('resets daysSinceLastAction to 0', () => {
    const agent = makeAgent({ daysSinceLastAction: 10 });
    const action: NpcAction = {
      characterId: 'test_npc',
      actionType: 'wait',
      description: '',
      pressureEffects: [],
    };
    const result = recordNpcAction(agent, action);
    expect(result.daysSinceLastAction).toBe(0);
  });

  it('keeps at most 5 recent actions', () => {
    const actions: NpcAction[] = Array.from({ length: 5 }, (_, i) => ({
      characterId: 'test_npc',
      actionType: 'wait' as const,
      description: `action_${i}`,
      pressureEffects: [],
    }));
    const agent = makeAgent({ recentActions: actions });
    const newAction: NpcAction = {
      characterId: 'test_npc',
      actionType: 'confront',
      description: 'new',
      pressureEffects: [],
    };
    const result = recordNpcAction(agent, newAction);
    expect(result.recentActions).toHaveLength(5);
    expect(result.recentActions[4].actionType).toBe('confront');
    expect(result.recentActions[0].description).toBe('action_1'); // first one dropped
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
  it('returns wait when no rules match', () => {
    const agent = makeAgent({ patience: 80 });
    const rules: NpcDecisionRule[] = [
      {
        conditions: { patienceBelow: 30 },
        enabledActions: ['confront'],
        basePressureEffects: [],
      },
    ];
    const state = createInitialWorldState();
    const char = makeCharacter();
    const result = filterPlausibleActions(agent, rules, state, char);
    expect(result.enabledActions).toEqual(['wait']);
    expect(result.autoEffects).toHaveLength(0);
  });

  it('matches patienceBelow condition', () => {
    const agent = makeAgent({ patience: 20 });
    const rules: NpcDecisionRule[] = [
      {
        conditions: { patienceBelow: 30 },
        enabledActions: ['confront', 'pressure_player'],
        basePressureEffects: [],
      },
    ];
    const state = createInitialWorldState();
    const char = makeCharacter();
    const result = filterPlausibleActions(agent, rules, state, char);
    expect(result.enabledActions).toContain('confront');
    expect(result.enabledActions).toContain('pressure_player');
  });

  it('matches pressureAbove condition', () => {
    const agent = makeAgent();
    const rules: NpcDecisionRule[] = [
      {
        conditions: { pressureAbove: { succession_crisis: 40 } },
        enabledActions: ['scheme'],
        basePressureEffects: [],
      },
    ];
    const state = createInitialWorldState();
    // succession_crisis defaults to 45, threshold 40 → matches
    const result = filterPlausibleActions(agent, rules, state, makeCharacter());
    expect(result.enabledActions).toContain('scheme');
  });

  it('does not match pressureAbove when below threshold', () => {
    const agent = makeAgent();
    const rules: NpcDecisionRule[] = [
      {
        conditions: { pressureAbove: { succession_crisis: 90 } },
        enabledActions: ['scheme'],
        basePressureEffects: [],
      },
    ];
    const state = createInitialWorldState();
    const result = filterPlausibleActions(agent, rules, state, makeCharacter());
    expect(result.enabledActions).toEqual(['wait']);
  });

  it('collects autoEffects from matched rules', () => {
    const agent = makeAgent({ patience: 10 });
    const rules: NpcDecisionRule[] = [
      {
        conditions: { patienceBelow: 20 },
        enabledActions: ['confront'],
        basePressureEffects: [
          { axisId: 'qinwangfu_desperation', delta: 3, reason: 'test', source: 'npc' },
        ],
      },
    ];
    const state = createInitialWorldState();
    const result = filterPlausibleActions(agent, rules, state, makeCharacter());
    expect(result.autoEffects).toHaveLength(1);
    expect(result.autoEffects[0].axisId).toBe('qinwangfu_desperation');
  });

  it('returns triggerEvent from matched rule', () => {
    const agent = makeAgent({ patience: 5 });
    const rules: NpcDecisionRule[] = [
      {
        conditions: { patienceBelow: 10 },
        enabledActions: ['confront'],
        basePressureEffects: [],
        triggerEvent: 'skeleton_ultimatum',
      },
    ];
    const state = createInitialWorldState();
    const result = filterPlausibleActions(agent, rules, state, makeCharacter());
    expect(result.triggerEvent).toBe('skeleton_ultimatum');
  });

  it('deduplicates enabled actions across multiple rules', () => {
    const agent = makeAgent({ patience: 10, daysSinceLastAction: 5 });
    const rules: NpcDecisionRule[] = [
      {
        conditions: { patienceBelow: 20 },
        enabledActions: ['confront', 'lobby'],
        basePressureEffects: [],
      },
      {
        conditions: { daysSinceLastActionAbove: 3 },
        enabledActions: ['confront', 'scheme'],
        basePressureEffects: [],
      },
    ];
    const state = createInitialWorldState();
    const result = filterPlausibleActions(agent, rules, state, makeCharacter());
    // 'confront' appears in both rules, should appear once
    const confrontCount = result.enabledActions.filter((a) => a === 'confront').length;
    expect(confrontCount).toBe(1);
    expect(result.enabledActions).toContain('lobby');
    expect(result.enabledActions).toContain('scheme');
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
        conditions: { relationshipBelow: { targetId: 'li_shimin', trust: 50 } },
        enabledActions: ['sabotage'],
        basePressureEffects: [],
      },
    ];
    const state = createInitialWorldState();
    const result = filterPlausibleActions(agent, rules, state, char);
    expect(result.enabledActions).toContain('sabotage');
  });
});
