import { describe, it, expect } from 'vitest';
import { eventInstanceToSceneConfig, buildResolutionPromptSection, buildSoftCapMessage } from '../eventRunner';
import type { EventInstance } from '../../../types/world';
import type { CalendarState } from '../../../types/world';

function makeInstance(overrides: Partial<EventInstance> = {}): EventInstance {
  return {
    skeletonId: 'skeleton_banquet_crisis',
    name: '东宫夜宴',
    location: '太极殿',
    activeNpcIds: ['weichi_jingde'],
    narratorIntro: '夜色渐深，灯火通明。',
    phases: [
      { id: 'phase_1', name: '入局', turnRange: [1, 3] as [number, number], suggestedActions: ['观察', '寒暄'] },
    ],
    resolution: {
      coreConflict: '能否安全脱身',
      resolutionSignals: [
        { outcome: 'success', description: '秦王离开宴席' },
        { outcome: 'failure', description: '冲突爆发' },
      ],
      softCap: 10,
      hardCap: 13,
    },
    pressureSnapshot: { succession_crisis: 45, jiancheng_hostility: 40, yuanji_ambition: 35, court_opinion: 30, qinwangfu_desperation: 25, imperial_suspicion: 20, military_readiness: 20 },
    outcomeEffects: [],
    ...overrides,
  };
}

const calendar: CalendarState = {
  year: 626,
  month: 1,
  day: 15,
  timeOfDay: 'morning',
  daysSinceStart: 14,
};

// ===== eventInstanceToSceneConfig =====

describe('eventInstanceToSceneConfig', () => {
  it('maps basic fields correctly', () => {
    const instance = makeInstance();
    const config = eventInstanceToSceneConfig(instance, calendar);
    expect(config.location).toBe('太极殿');
    expect(config.narratorIntro).toBe('夜色渐深，灯火通明。');
    expect(config.activeNpcIds).toEqual(['weichi_jingde']);
  });

  it('generates id with skeleton prefix', () => {
    const instance = makeInstance();
    const config = eventInstanceToSceneConfig(instance, calendar);
    expect(config.id).toMatch(/^event_skeleton_banquet_crisis_/);
  });

  it('maps resolution softCap/hardCap to endingTrigger', () => {
    const instance = makeInstance();
    const config = eventInstanceToSceneConfig(instance, calendar);
    expect(config.endingTrigger.minTurns).toBe(10);
    expect(config.endingTrigger.maxTurns).toBe(13);
  });

  it('passes phases through', () => {
    const instance = makeInstance();
    const config = eventInstanceToSceneConfig(instance, calendar);
    expect(config.phases).toEqual(instance.phases);
  });

  it('formats calendar time', () => {
    const instance = makeInstance();
    const config = eventInstanceToSceneConfig(instance, calendar);
    expect(config.time.length).toBeGreaterThan(0);
  });
});

// ===== buildResolutionPromptSection =====

describe('buildResolutionPromptSection', () => {
  it('includes coreConflict', () => {
    const result = buildResolutionPromptSection(makeInstance());
    expect(result).toContain('能否安全脱身');
  });

  it('includes all resolutionSignals', () => {
    const result = buildResolutionPromptSection(makeInstance());
    expect(result).toContain('秦王离开宴席');
    expect(result).toContain('冲突爆发');
  });

  it('includes ending instruction', () => {
    const result = buildResolutionPromptSection(makeInstance());
    expect(result).toContain('"ending"');
  });
});

// ===== buildSoftCapMessage =====

describe('buildSoftCapMessage', () => {
  it('includes coreConflict', () => {
    const result = buildSoftCapMessage(makeInstance());
    expect(result).toContain('能否安全脱身');
  });

  it('returns non-empty string', () => {
    const result = buildSoftCapMessage(makeInstance());
    expect(result.length).toBeGreaterThan(0);
  });
});
