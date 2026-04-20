import { describe, it, expect } from 'vitest';
import {
  createDefaultPressureAxes,
  tickAxis,
  tickPressure,
  applyPressureModifiers,
  checkEventTriggers,
  snapshotPressure,
} from '../pressure';
import { createInitialWorldState } from '../worldState';
import type { PressureAxis, PressureAxisId, PressureModifier, EventSkeleton } from '../../../types/world';

// --- helper ---

function makeAxis(overrides: Partial<PressureAxis> = {}): PressureAxis {
  return {
    id: 'succession_crisis',
    value: 50,
    velocity: 0.3,
    baseline: 70,
    floor: 0,
    ceiling: 100,
    decayRate: 0.05,
    ...overrides,
  };
}

// --- tickAxis ---

describe('tickAxis', () => {
  it('applies velocity drift', () => {
    const axis = makeAxis({ value: 50, velocity: 2, baseline: 50, decayRate: 0 });
    const ticked = tickAxis(axis);
    expect(ticked.value).toBe(52);
  });

  it('decays toward baseline', () => {
    // value above baseline with positive decay
    const axis = makeAxis({ value: 80, velocity: 0, baseline: 50, decayRate: 0.1 });
    const ticked = tickAxis(axis);
    // newValue = 80 + 0 = 80; diff = 80 - 50 = 30; newValue = 80 - 30*0.1 = 77
    expect(ticked.value).toBe(77);
  });

  it('decays toward baseline from below', () => {
    const axis = makeAxis({ value: 30, velocity: 0, baseline: 50, decayRate: 0.1 });
    const ticked = tickAxis(axis);
    // newValue = 30; diff = 30 - 50 = -20; newValue = 30 - (-20)*0.1 = 32
    expect(ticked.value).toBe(32);
  });

  it('clamps to floor', () => {
    const axis = makeAxis({ value: 2, velocity: -10, floor: 0, baseline: 0, decayRate: 0 });
    const ticked = tickAxis(axis);
    expect(ticked.value).toBe(0);
  });

  it('clamps to ceiling', () => {
    const axis = makeAxis({ value: 98, velocity: 10, ceiling: 100, baseline: 100, decayRate: 0 });
    const ticked = tickAxis(axis);
    expect(ticked.value).toBe(100);
  });

  it('is pure — does not mutate input', () => {
    const axis = makeAxis();
    const original = { ...axis };
    tickAxis(axis);
    expect(axis).toEqual(original);
  });
});

// --- tickPressure ---

describe('tickPressure', () => {
  it('ticks all 7 default axes', () => {
    const axes = createDefaultPressureAxes();
    const ticked = tickPressure(axes);
    const ids = Object.keys(ticked);
    expect(ids).toHaveLength(7);
    // Each axis should have changed
    for (const id of ids) {
      const key = id as keyof typeof axes;
      expect(ticked[key].value).not.toBe(axes[key].value);
    }
  });
});

// --- applyPressureModifiers ---

describe('applyPressureModifiers', () => {
  it('applies a single delta', () => {
    const axes = createDefaultPressureAxes();
    const original = axes.succession_crisis.value;
    const mods: PressureModifier[] = [
      { axisId: 'succession_crisis', delta: 10, reason: 'test', source: 'test' },
    ];
    const result = applyPressureModifiers(axes, mods);
    expect(result.succession_crisis.value).toBe(original + 10);
  });

  it('applies velocityDelta', () => {
    const axes = createDefaultPressureAxes();
    const originalVel = axes.court_opinion.velocity;
    const mods: PressureModifier[] = [
      { axisId: 'court_opinion', delta: 0, velocityDelta: 0.5, reason: 'test', source: 'test' },
    ];
    const result = applyPressureModifiers(axes, mods);
    expect(result.court_opinion.velocity).toBe(originalVel + 0.5);
  });

  it('clamps to ceiling', () => {
    const axes = createDefaultPressureAxes();
    const mods: PressureModifier[] = [
      { axisId: 'succession_crisis', delta: 999, reason: 'test', source: 'test' },
    ];
    const result = applyPressureModifiers(axes, mods);
    expect(result.succession_crisis.value).toBe(axes.succession_crisis.ceiling);
  });

  it('clamps to floor', () => {
    const axes = createDefaultPressureAxes();
    const mods: PressureModifier[] = [
      { axisId: 'military_readiness', delta: -999, reason: 'test', source: 'test' },
    ];
    const result = applyPressureModifiers(axes, mods);
    expect(result.military_readiness.value).toBe(axes.military_readiness.floor);
  });

  it('skips invalid axisId without crashing', () => {
    const axes = createDefaultPressureAxes();
    const mods: PressureModifier[] = [
      { axisId: 'nonexistent' as PressureAxisId, delta: 10, reason: 'test', source: 'test' },
    ];
    expect(() => applyPressureModifiers(axes, mods)).not.toThrow();
  });

  it('applies multiple modifiers in order', () => {
    const axes = createDefaultPressureAxes();
    const original = axes.court_opinion.value;
    const mods: PressureModifier[] = [
      { axisId: 'court_opinion', delta: 5, reason: 'a', source: 'a' },
      { axisId: 'court_opinion', delta: -3, reason: 'b', source: 'b' },
    ];
    const result = applyPressureModifiers(axes, mods);
    expect(result.court_opinion.value).toBe(original + 5 - 3);
  });

  it('is pure — does not mutate input', () => {
    const axes = createDefaultPressureAxes();
    const snapshot = JSON.parse(JSON.stringify(axes));
    applyPressureModifiers(axes, [
      { axisId: 'succession_crisis', delta: 10, reason: 'test', source: 'test' },
    ]);
    expect(axes.succession_crisis.value).toBe(snapshot.succession_crisis.value);
  });
});

// --- snapshotPressure ---

describe('snapshotPressure', () => {
  it('returns a record of axis values', () => {
    const axes = createDefaultPressureAxes();
    const snap = snapshotPressure(axes);
    expect(Object.keys(snap)).toHaveLength(7);
    expect(snap.succession_crisis).toBe(axes.succession_crisis.value);
    expect(snap.military_readiness).toBe(axes.military_readiness.value);
  });
});

// --- checkEventTriggers ---

describe('checkEventTriggers', () => {
  function makeMinimalSkeleton(overrides: Partial<EventSkeleton> = {}): EventSkeleton {
    return {
      id: 'test_skeleton',
      category: 'test',
      description: 'test event',
      preconditions: [],
      pressureTriggers: [
        { axes: [{ axisId: 'succession_crisis', threshold: 40, weight: 1 }] },
      ],
      priority: 50,
      cooldownDays: 0,
      maxOccurrences: 3,
      phaseSkeletons: [{ role: 'phase1', description: 'test', turnRange: [1, 3] as [number, number] }],
      resolution: { coreConflict: 'test', resolutionSignals: [], softCap: 5, hardCap: 10 },
      constraints: [],
      possibleLocations: ['test'],
      requiredRoles: [],
      baseOutcomeEffects: [],
      ...overrides,
    };
  }

  it('triggers when pressure threshold is met', () => {
    const state = createInitialWorldState();
    // succession_crisis starts at 45, threshold is 40
    const skeletons = [makeMinimalSkeleton()];
    const result = checkEventTriggers(state, skeletons);
    expect(result).toHaveLength(1);
    expect(result[0].skeletonId).toBe('test_skeleton');
  });

  it('does not trigger when pressure is below threshold', () => {
    const state = createInitialWorldState();
    const skeletons = [makeMinimalSkeleton({
      pressureTriggers: [
        { axes: [{ axisId: 'succession_crisis', threshold: 90, weight: 1 }] },
      ],
    })];
    const result = checkEventTriggers(state, skeletons);
    expect(result).toHaveLength(0);
  });

  it('respects maxOccurrences', () => {
    const state = createInitialWorldState();
    state.eventLog = [
      { instanceId: 'test_1', skeletonId: 'test_skeleton', name: 'test', day: 0, summary: '', pressureEffects: [] },
      { instanceId: 'test_2', skeletonId: 'test_skeleton', name: 'test', day: 1, summary: '', pressureEffects: [] },
      { instanceId: 'test_3', skeletonId: 'test_skeleton', name: 'test', day: 2, summary: '', pressureEffects: [] },
    ];
    const skeletons = [makeMinimalSkeleton()];
    const result = checkEventTriggers(state, skeletons);
    expect(result).toHaveLength(0);
  });

  it('respects cooldown period', () => {
    const state = createInitialWorldState();
    state.eventLog = [
      { instanceId: 'test_1', skeletonId: 'test_skeleton', name: 'test', day: 0, summary: '', pressureEffects: [] },
    ];
    state.calendar.daysSinceStart = 2;
    const skeletons = [makeMinimalSkeleton({
      cooldownDays: 5,
      maxOccurrences: 10, // 确保不被 maxOccurrences 限制
    })];
    const result = checkEventTriggers(state, skeletons);
    expect(result).toHaveLength(0);
  });

  it('allows trigger after cooldown expires', () => {
    const state = createInitialWorldState();
    state.eventLog = [
      { instanceId: 'test_1', skeletonId: 'test_skeleton', name: 'test', day: 0, summary: '', pressureEffects: [] },
    ];
    state.calendar.daysSinceStart = 10;
    const skeletons = [makeMinimalSkeleton({ cooldownDays: 5, maxOccurrences: 10 })];
    const result = checkEventTriggers(state, skeletons);
    expect(result).toHaveLength(1);
  });

  it('does not duplicate already pending events', () => {
    const state = createInitialWorldState();
    state.pendingEvents = [{ skeletonId: 'test_skeleton', triggeredOnDay: 0, pressureSnapshot: {} as Record<PressureAxisId, number> }];
    const skeletons = [makeMinimalSkeleton()];
    const result = checkEventTriggers(state, skeletons);
    expect(result).toHaveLength(0);
  });

  it('respects preconditions — flag check', () => {
    const state = createInitialWorldState();
    const skeletons = [makeMinimalSkeleton({
      preconditions: [{ type: 'flag', params: { key: 'special_flag', value: true } }],
    })];
    // Flag not set → should not trigger
    expect(checkEventTriggers(state, skeletons)).toHaveLength(0);
    // Set the flag
    state.globalFlags['special_flag'] = true;
    expect(checkEventTriggers(state, skeletons)).toHaveLength(1);
  });

  it('returns at most 1 event (highest priority)', () => {
    const state = createInitialWorldState();
    const skeletons = [
      makeMinimalSkeleton({ id: 'low_prio', priority: 10 }),
      makeMinimalSkeleton({ id: 'high_prio', priority: 90 }),
    ];
    const result = checkEventTriggers(state, skeletons);
    expect(result).toHaveLength(1);
    expect(result[0].skeletonId).toBe('high_prio');
  });
});
