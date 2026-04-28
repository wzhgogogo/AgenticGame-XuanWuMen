import { describe, it, expect } from 'vitest';
import {
  ALL_SKELETONS,
  banquetCrisis,
  politicalConfrontation,
  assassinationCrisis,
  subordinateUltimatum,
  imperialSummons,
  intelligenceEvent,
  allyWavering,
  militaryConflict,
} from './index';
import { checkEventTriggers } from '../../engine/world/pressure';
import { createInitialWorldState } from '../../engine/world/worldState';
import type { PressureAxisId } from '../../types/world';

const VALID_AXIS_IDS: PressureAxisId[] = [
  'succession_crisis',
  'jiancheng_hostility',
  'yuanji_ambition',
  'court_opinion',
  'qinwangfu_desperation',
  'imperial_suspicion',
  'military_readiness',
];

const VALID_PRECONDITION_TYPES = [
  'flag',
  'pressure_above',
  'pressure_below',
  'day_range',
  'relationship_above',
  'relationship_below',
  'event_completed',
  'event_not_completed',
  'npc_patience_below',
];

// ===== 结构完整性 =====

describe('ALL_SKELETONS structural integrity', () => {
  it('contains exactly 11 skeletons', () => {
    expect(ALL_SKELETONS).toHaveLength(11);
  });

  it('all IDs are unique', () => {
    const ids = ALL_SKELETONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  ALL_SKELETONS.forEach((skeleton) => {
    describe(`skeleton "${skeleton.id}"`, () => {
      it('has non-empty id, category, description', () => {
        expect(skeleton.id.length).toBeGreaterThan(0);
        expect(skeleton.category.length).toBeGreaterThan(0);
        expect(skeleton.description.length).toBeGreaterThan(0);
      });

      it('has valid pressureTriggers', () => {
        expect(skeleton.pressureTriggers.length).toBeGreaterThan(0);
        for (const trigger of skeleton.pressureTriggers) {
          expect(trigger.axes.length).toBeGreaterThan(0);
          for (const axis of trigger.axes) {
            expect(VALID_AXIS_IDS).toContain(axis.axisId);
            expect(axis.weight).toBeGreaterThan(0);
            expect(axis.threshold).toBeGreaterThanOrEqual(0);
          }
        }
      });

      it('has valid precondition types', () => {
        for (const pre of skeleton.preconditions) {
          expect(VALID_PRECONDITION_TYPES).toContain(pre.type);
        }
      });

      it('has valid phaseSkeletons with turnRange min <= max', () => {
        expect(skeleton.phaseSkeletons.length).toBeGreaterThan(0);
        for (const phase of skeleton.phaseSkeletons) {
          expect(phase.role.length).toBeGreaterThan(0);
          expect(phase.turnRange[0]).toBeLessThanOrEqual(phase.turnRange[1]);
        }
      });

      it('has resolution with softCap < hardCap and both > 0', () => {
        expect(skeleton.resolution.softCap).toBeGreaterThan(0);
        expect(skeleton.resolution.hardCap).toBeGreaterThan(0);
        expect(skeleton.resolution.softCap).toBeLessThan(skeleton.resolution.hardCap);
      });

      it('has valid baseOutcomeEffects (pressure modifiers reference valid axisIds)', () => {
        for (const effect of skeleton.baseOutcomeEffects) {
          expect(effect.id).toBeTruthy();
          expect(['success', 'partial', 'failure', 'disaster']).toContain(effect.tag);
          if (effect.kind === 'pressure') {
            expect(VALID_AXIS_IDS).toContain(effect.modifier.axisId);
          }
        }
      });

      it('has valid cooldownDays, maxOccurrences, priority', () => {
        expect(skeleton.cooldownDays).toBeGreaterThanOrEqual(0);
        expect(skeleton.maxOccurrences).toBeGreaterThanOrEqual(1);
        expect(skeleton.priority).toBeGreaterThan(0);
      });

      it('requiredNpcIds (if present) are valid NPC IDs', () => {
        const VALID_NPC_IDS = [
          'changsun_wuji', 'weichi_jingde', 'fang_xuanling',
          'li_jiancheng', 'li_yuanji', 'li_yuan',
        ];
        if (skeleton.requiredNpcIds) {
          for (const id of skeleton.requiredNpcIds) {
            expect(VALID_NPC_IDS).toContain(id);
          }
        }
      });
    });
  });
});

// ===== 各骨架特征断言 =====

describe('individual skeleton characteristics', () => {
  it('banquetCrisis: precondition requires jiancheng_hostility > 65', () => {
    const pre = banquetCrisis.preconditions.find(
      (p) => p.type === 'pressure_above' && p.params['axisId'] === 'jiancheng_hostility',
    );
    expect(pre).toBeDefined();
    expect(pre!.params['value']).toBe(65);
  });

  it('politicalConfrontation: precondition requires court_opinion > 50', () => {
    const pre = politicalConfrontation.preconditions.find(
      (p) => p.type === 'pressure_above' && p.params['axisId'] === 'court_opinion',
    );
    expect(pre).toBeDefined();
    expect(pre!.params['value']).toBe(50);
  });

  it('assassinationCrisis: 2 preconditions, priority 85', () => {
    expect(assassinationCrisis.preconditions).toHaveLength(2);
    expect(assassinationCrisis.priority).toBe(85);
  });

  it('subordinateUltimatum: has npc_patience_below precondition, maxOccurrences 1', () => {
    const pre = subordinateUltimatum.preconditions.find(
      (p) => p.type === 'npc_patience_below',
    );
    expect(pre).toBeDefined();
    expect(subordinateUltimatum.maxOccurrences).toBe(1);
  });

  it('imperialSummons: no preconditions, 2 pressureTriggers (OR logic)', () => {
    expect(imperialSummons.preconditions).toHaveLength(0);
    expect(imperialSummons.pressureTriggers).toHaveLength(2);
  });

  it('intelligenceEvent: has day_range precondition, maxOccurrences 5', () => {
    const pre = intelligenceEvent.preconditions.find((p) => p.type === 'day_range');
    expect(pre).toBeDefined();
    expect(intelligenceEvent.maxOccurrences).toBe(5);
  });

  it('militaryConflict: 3 preconditions, highest priority 95, cooldownDays 0', () => {
    expect(militaryConflict.preconditions).toHaveLength(3);
    expect(militaryConflict.priority).toBe(95);
    expect(militaryConflict.cooldownDays).toBe(0);
  });

  it('allyWavering: precondition requires qinwangfu_desperation > 60', () => {
    const pre = allyWavering.preconditions.find(
      (p) => p.type === 'pressure_above' && p.params['axisId'] === 'qinwangfu_desperation',
    );
    expect(pre).toBeDefined();
    expect(pre!.params['value']).toBe(60);
  });

  it('assassinationCrisis locks li_jiancheng and li_yuanji', () => {
    expect(assassinationCrisis.requiredNpcIds).toEqual(['li_jiancheng', 'li_yuanji']);
  });

  it('imperialSummons locks li_yuan', () => {
    expect(imperialSummons.requiredNpcIds).toEqual(['li_yuan']);
  });

  it('militaryConflict locks li_jiancheng and li_yuanji', () => {
    expect(militaryConflict.requiredNpcIds).toEqual(['li_jiancheng', 'li_yuanji']);
  });
});

// ===== 优先级排序 =====

describe('priority ordering', () => {
  it('militaryConflict > subordinateUltimatum > assassinationCrisis', () => {
    expect(militaryConflict.priority).toBeGreaterThan(subordinateUltimatum.priority);
    expect(subordinateUltimatum.priority).toBeGreaterThan(assassinationCrisis.priority);
  });

  it('assassinationCrisis > imperialSummons > banquetCrisis', () => {
    expect(assassinationCrisis.priority).toBeGreaterThan(imperialSummons.priority);
    expect(imperialSummons.priority).toBeGreaterThan(banquetCrisis.priority);
  });

  it('intelligenceEvent has the lowest priority', () => {
    for (const s of ALL_SKELETONS) {
      if (s.id !== intelligenceEvent.id) {
        expect(s.priority).toBeGreaterThan(intelligenceEvent.priority);
      }
    }
  });
});

// ===== checkEventTriggers 集成 =====

describe('checkEventTriggers with real skeletons', () => {
  it('no skeletons trigger at initial world state', () => {
    const state = createInitialWorldState();
    const triggered = checkEventTriggers(state, ALL_SKELETONS);
    expect(triggered).toHaveLength(0);
  });

  it('militaryConflict does not trigger even at moderate pressure', () => {
    const state = createInitialWorldState();
    state.pressureAxes['succession_crisis'].value = 70;
    state.pressureAxes['military_readiness'].value = 50;
    const triggered = checkEventTriggers(state, [militaryConflict]);
    expect(triggered).toHaveLength(0);
  });

  it('imperialSummons triggers via first trigger (imperial_suspicion)', () => {
    const state = createInitialWorldState();
    state.pressureAxes['imperial_suspicion'].value = 60;
    const triggered = checkEventTriggers(state, [imperialSummons]);
    expect(triggered).toHaveLength(1);
    expect(triggered[0].skeletonId).toBe(imperialSummons.id);
  });

  it('imperialSummons triggers via second trigger (succession_crisis)', () => {
    const state = createInitialWorldState();
    state.pressureAxes['succession_crisis'].value = 85;
    const triggered = checkEventTriggers(state, [imperialSummons]);
    expect(triggered).toHaveLength(1);
    expect(triggered[0].skeletonId).toBe(imperialSummons.id);
  });

  it('intelligenceEvent triggers when succession_crisis >= 45 (initial value)', () => {
    const state = createInitialWorldState();
    // intelligenceEvent has day_range precondition: minDay=2
    state.calendar.daysSinceStart = 5;
    const triggered = checkEventTriggers(state, [intelligenceEvent]);
    expect(triggered).toHaveLength(1);
    expect(triggered[0].skeletonId).toBe(intelligenceEvent.id);
  });

  it('intelligenceEvent blocked by day_range precondition on day 0', () => {
    const state = createInitialWorldState();
    state.calendar.daysSinceStart = 0;
    const triggered = checkEventTriggers(state, [intelligenceEvent]);
    expect(triggered).toHaveLength(0);
  });

  it('banquetCrisis triggers when jiancheng_hostility is high enough', () => {
    const state = createInitialWorldState();
    state.pressureAxes['jiancheng_hostility'].value = 75;
    state.pressureAxes['succession_crisis'].value = 55;
    const triggered = checkEventTriggers(state, [banquetCrisis]);
    expect(triggered).toHaveLength(1);
    expect(triggered[0].skeletonId).toBe(banquetCrisis.id);
  });

  it('returns highest priority skeleton when multiple are eligible', () => {
    const state = createInitialWorldState();
    // Push pressures high enough to trigger both imperialSummons and intelligenceEvent
    state.pressureAxes['imperial_suspicion'].value = 60;
    state.pressureAxes['succession_crisis'].value = 50;
    state.calendar.daysSinceStart = 5;
    const triggered = checkEventTriggers(state, [intelligenceEvent, imperialSummons]);
    // checkEventTriggers returns at most 1 event, picks highest priority
    expect(triggered.length).toBe(1);
    // imperialSummons priority 75 > intelligenceEvent priority 40
    expect(triggered[0].skeletonId).toBe(imperialSummons.id);
  });
});
