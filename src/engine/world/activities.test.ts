import { describe, it, expect } from 'vitest';
import {
  applyActivityEffects,
  getActivitiesForTimeSlot,
  getFlavorText,
  ALL_ACTIVITIES,
  GOVERNANCE_ACTIVITIES,
  MILITARY_ACTIVITIES,
  INTELLIGENCE_ACTIVITIES,
  SOCIAL_ACTIVITIES,
  PERSONAL_ACTIVITIES,
} from './activities';
import { createInitialWorldState } from './worldState';
import type { DailyActivity } from '../../types/world';

// --- getActivitiesForTimeSlot ---

describe('getActivitiesForTimeSlot', () => {
  it('returns activities for morning', () => {
    const result = getActivitiesForTimeSlot('morning');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((a) => a.duration === 'morning')).toBe(true);
  });

  it('returns activities for afternoon', () => {
    const result = getActivitiesForTimeSlot('afternoon');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((a) => a.duration === 'afternoon')).toBe(true);
  });

  it('returns activities for evening', () => {
    const result = getActivitiesForTimeSlot('evening');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((a) => a.duration === 'evening')).toBe(true);
  });

  it('all activities have unique IDs', () => {
    const ids = ALL_ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('total activities count matches category sums', () => {
    const total =
      GOVERNANCE_ACTIVITIES.length +
      MILITARY_ACTIVITIES.length +
      INTELLIGENCE_ACTIVITIES.length +
      SOCIAL_ACTIVITIES.length +
      PERSONAL_ACTIVITIES.length;
    expect(ALL_ACTIVITIES).toHaveLength(total);
  });
});

// --- getFlavorText ---

describe('getFlavorText', () => {
  it('returns a string from flavorTexts', () => {
    const activity = ALL_ACTIVITIES.find((a) => a.flavorTexts.length > 0)!;
    const text = getFlavorText(activity);
    expect(activity.flavorTexts).toContain(text);
  });

  it('returns empty string for activity with no flavorTexts', () => {
    const emptyActivity: DailyActivity = {
      id: 'test',
      name: 'test',
      category: 'personal',
      description: 'test',
      duration: 'morning',
      effects: [],
      flavorTexts: [],
    };
    expect(getFlavorText(emptyActivity)).toBe('');
  });
});

// --- applyActivityEffects ---

describe('applyActivityEffects', () => {
  it('generates PressureModifier for pressure effect', () => {
    const state = createInitialWorldState();
    // review_memorials has pressure effect: court_opinion -2
    const activity = GOVERNANCE_ACTIVITIES.find((a) => a.id === 'review_memorials')!;
    const { pressureChanges } = applyActivityEffects(state, activity);
    expect(pressureChanges.length).toBeGreaterThan(0);
    const courtMod = pressureChanges.find((m) => m.axisId === 'court_opinion');
    expect(courtMod).toBeDefined();
    expect(courtMod!.delta).toBe(-2);
  });

  it('modifies npc patience for npc_patience effect', () => {
    const state = createInitialWorldState();
    const originalPatience = state.npcAgents['weichi_jingde'].patience;
    // reassure_jingde has npc_patience effect: weichi_jingde +8
    const activity = SOCIAL_ACTIVITIES.find((a) => a.id === 'reassure_jingde')!;
    const { state: newState } = applyActivityEffects(state, activity);
    expect(newState.npcAgents['weichi_jingde'].patience).toBe(originalPatience + 8);
  });

  it('clamps npc patience to [0, 100]', () => {
    const state = createInitialWorldState();
    state.npcAgents['weichi_jingde'].patience = 98;
    const activity = SOCIAL_ACTIVITIES.find((a) => a.id === 'reassure_jingde')!;
    const { state: newState } = applyActivityEffects(state, activity);
    expect(newState.npcAgents['weichi_jingde'].patience).toBe(100);
  });

  it('sets globalFlags for flag effect', () => {
    const state = createInitialWorldState();
    // summon_spy has flag effect: has_recent_intel = true
    const activity = INTELLIGENCE_ACTIVITIES.find((a) => a.id === 'summon_spy')!;
    const { state: newState } = applyActivityEffects(state, activity);
    expect(newState.globalFlags['has_recent_intel']).toBe(true);
  });

  it('returns empty pressureChanges for effectless activity', () => {
    const state = createInitialWorldState();
    // study has no effects
    const activity = PERSONAL_ACTIVITIES.find((a) => a.id === 'study')!;
    const { pressureChanges } = applyActivityEffects(state, activity);
    expect(pressureChanges).toHaveLength(0);
  });

  it('handles activity with multiple pressure effects', () => {
    const state = createInitialWorldState();
    // meet_officials has 2 pressure effects
    const activity = GOVERNANCE_ACTIVITIES.find((a) => a.id === 'meet_officials')!;
    const { pressureChanges } = applyActivityEffects(state, activity);
    expect(pressureChanges.length).toBe(2);
  });

  it('is pure — does not mutate input state', () => {
    const state = createInitialWorldState();
    const origPatience = state.npcAgents['weichi_jingde'].patience;
    const activity = SOCIAL_ACTIVITIES.find((a) => a.id === 'reassure_jingde')!;
    applyActivityEffects(state, activity);
    expect(state.npcAgents['weichi_jingde'].patience).toBe(origPatience);
  });
});
