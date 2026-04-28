import { describe, it, expect } from 'vitest';
import {
  appendPlayerAction,
  getRecentPlayerActions,
  createInitialWorldState,
} from '../worldState';
import type { PlayerAction, WorldState } from '../../../types/world';

function mkAction(day: number, id: string, overrides: Partial<PlayerAction> = {}): PlayerAction {
  return {
    day,
    date: `day-${day}`,
    type: 'activity',
    id,
    name: id,
    ...overrides,
  };
}

describe('appendPlayerAction', () => {
  it('appends to empty log', () => {
    const result = appendPlayerAction([], mkAction(1, 'a'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('accepts undefined log', () => {
    const result = appendPlayerAction(undefined, mkAction(1, 'a'));
    expect(result).toHaveLength(1);
  });

  it('caps at 30 entries (slides window)', () => {
    let log: PlayerAction[] = [];
    for (let i = 0; i < 35; i++) {
      log = appendPlayerAction(log, mkAction(i, `a${i}`));
    }
    expect(log).toHaveLength(30);
    expect(log[0].id).toBe('a5');       // 最旧 5 条被踢掉
    expect(log[29].id).toBe('a34');
  });
});

describe('getRecentPlayerActions', () => {
  function makeState(log: PlayerAction[], currentDay: number): WorldState {
    const s = createInitialWorldState();
    return {
      ...s,
      calendar: { ...s.calendar, daysSinceStart: currentDay },
      playerActionLog: log,
    };
  }

  it('returns only actions within last N days', () => {
    const log: PlayerAction[] = [
      mkAction(1, 'old'),
      mkAction(5, 'mid'),
      mkAction(10, 'recent'),
    ];
    const state = makeState(log, 12);
    const recent = getRecentPlayerActions(state, 5);
    // cutoff = 12 - 5 = 7，只有 day >=7 的入选
    expect(recent.map(a => a.id)).toEqual(['recent']);
  });

  it('returns all when log within range', () => {
    const log = [mkAction(8, 'a'), mkAction(9, 'b')];
    const state = makeState(log, 10);
    expect(getRecentPlayerActions(state, 5)).toHaveLength(2);
  });

  it('handles empty log', () => {
    const state = makeState([], 10);
    expect(getRecentPlayerActions(state, 5)).toEqual([]);
  });
});

describe('createInitialWorldState', () => {
  it('initializes playerActionLog as empty array', () => {
    const state = createInitialWorldState();
    expect(state.playerActionLog).toEqual([]);
  });
});
