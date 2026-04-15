import { describe, it, expect } from 'vitest';
import { createCalendar, advanceDay, advanceTimeOfDay, formatDate, formatCalendar, formatMonth, isAfterDate, getDaysInMonth } from './calendar';

describe('createCalendar', () => {
  it('creates calendar with default values', () => {
    const cal = createCalendar();
    expect(cal.year).toBe(626);
    expect(cal.month).toBe(1);
    expect(cal.day).toBe(1);
    expect(cal.timeOfDay).toBe('morning');
    expect(cal.daysSinceStart).toBe(0);
  });

  it('creates calendar with custom month and day', () => {
    const cal = createCalendar(6, 15);
    expect(cal.month).toBe(6);
    expect(cal.day).toBe(15);
  });
});

describe('advanceDay', () => {
  it('advances to next day', () => {
    const cal = createCalendar(1, 1);
    const next = advanceDay(cal);
    expect(next.day).toBe(2);
    expect(next.month).toBe(1);
    expect(next.daysSinceStart).toBe(1);
    expect(next.timeOfDay).toBe('morning');
  });

  it('resets timeOfDay to morning', () => {
    const cal = { ...createCalendar(), timeOfDay: 'evening' as const };
    const next = advanceDay(cal);
    expect(next.timeOfDay).toBe('morning');
  });

  it('wraps month on last day of big month (30 days)', () => {
    const cal = createCalendar(1, 30); // 正月有30天
    const next = advanceDay(cal);
    expect(next.month).toBe(2);
    expect(next.day).toBe(1);
  });

  it('wraps month on last day of small month (29 days)', () => {
    const cal = createCalendar(2, 29); // 二月有29天
    const next = advanceDay(cal);
    expect(next.month).toBe(3);
    expect(next.day).toBe(1);
  });

  it('wraps year on month 12 day 30', () => {
    const cal = createCalendar(12, 30);
    const next = advanceDay(cal);
    expect(next.month).toBe(1);
    expect(next.day).toBe(1);
  });

  it('accumulates daysSinceStart over multiple advances', () => {
    let cal = createCalendar();
    for (let i = 0; i < 10; i++) {
      cal = advanceDay(cal);
    }
    expect(cal.daysSinceStart).toBe(10);
  });

  it('is pure — does not mutate input', () => {
    const cal = createCalendar(1, 5);
    const original = { ...cal };
    advanceDay(cal);
    expect(cal).toEqual(original);
  });
});

describe('advanceTimeOfDay', () => {
  it('morning → afternoon', () => {
    const cal = createCalendar();
    expect(advanceTimeOfDay(cal).timeOfDay).toBe('afternoon');
  });

  it('afternoon → evening', () => {
    const cal = { ...createCalendar(), timeOfDay: 'afternoon' as const };
    expect(advanceTimeOfDay(cal).timeOfDay).toBe('evening');
  });

  it('evening → night', () => {
    const cal = { ...createCalendar(), timeOfDay: 'evening' as const };
    expect(advanceTimeOfDay(cal).timeOfDay).toBe('night');
  });

  it('night → next day morning (calls advanceDay)', () => {
    const cal = { ...createCalendar(1, 5), timeOfDay: 'night' as const };
    const next = advanceTimeOfDay(cal);
    expect(next.timeOfDay).toBe('morning');
    expect(next.day).toBe(6);
    expect(next.daysSinceStart).toBe(1);
  });
});

describe('formatDate', () => {
  it('formats 正月初一', () => {
    expect(formatDate(createCalendar(1, 1))).toBe('武德九年正月初一');
  });

  it('formats 六月十五', () => {
    expect(formatDate(createCalendar(6, 15))).toBe('武德九年六月十五');
  });

  it('formats 初十 correctly', () => {
    expect(formatDate(createCalendar(3, 10))).toBe('武德九年三月初十');
  });

  it('formats 二十 correctly', () => {
    expect(formatDate(createCalendar(5, 20))).toBe('武德九年五月二十');
  });

  it('formats 三十 correctly', () => {
    expect(formatDate(createCalendar(1, 30))).toBe('武德九年正月三十');
  });

  it('formats 廿X days (21-29)', () => {
    expect(formatDate(createCalendar(1, 25))).toBe('武德九年正月廿五');
  });

  it('formats 十X days (11-19)', () => {
    expect(formatDate(createCalendar(1, 13))).toBe('武德九年正月十三');
  });
});

describe('formatCalendar', () => {
  it('includes time of day', () => {
    const result = formatCalendar(createCalendar(1, 1));
    expect(result).toContain('辰时');
    expect(result).toContain('正月');
  });
});

describe('formatMonth', () => {
  it('returns Chinese month name', () => {
    expect(formatMonth(createCalendar(1, 1))).toBe('正月');
    expect(formatMonth(createCalendar(6, 1))).toBe('六月');
    expect(formatMonth(createCalendar(12, 1))).toBe('十二月');
  });
});

describe('isAfterDate', () => {
  it('returns true when month is later', () => {
    expect(isAfterDate(createCalendar(3, 1), 2, 15)).toBe(true);
  });

  it('returns true when same month but day is later', () => {
    expect(isAfterDate(createCalendar(2, 20), 2, 15)).toBe(true);
  });

  it('returns false when before', () => {
    expect(isAfterDate(createCalendar(2, 10), 2, 15)).toBe(false);
  });

  it('returns false when equal', () => {
    expect(isAfterDate(createCalendar(2, 15), 2, 15)).toBe(false);
  });
});

describe('getDaysInMonth', () => {
  it('returns 30 for big months', () => {
    expect(getDaysInMonth(1)).toBe(30);
    expect(getDaysInMonth(3)).toBe(30);
    expect(getDaysInMonth(7)).toBe(30);
    expect(getDaysInMonth(8)).toBe(30);
  });

  it('returns 29 for small months', () => {
    expect(getDaysInMonth(2)).toBe(29);
    expect(getDaysInMonth(4)).toBe(29);
    expect(getDaysInMonth(6)).toBe(29);
    expect(getDaysInMonth(9)).toBe(29);
  });

  it('returns 30 for unknown month', () => {
    expect(getDaysInMonth(13)).toBe(30);
  });
});
