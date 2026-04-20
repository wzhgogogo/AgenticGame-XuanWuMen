import { describe, it, expect } from 'vitest';
import { detectNarrativeEnding } from '../worldSimulator';

describe('detectNarrativeEnding', () => {
  it('returns coup_fail_captured for death keywords', () => {
    expect(detectNarrativeEnding('秦王被太子亲卫斩首于殿前')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('李世民被赐死')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('世民被毒杀于府中')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('秦王被处死于殿前')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('秦王被缢死于狱中')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('秦王被诛杀')).toBe('coup_fail_captured');
  });

  it('returns coup_fail_captured for loseAll keywords', () => {
    expect(detectNarrativeEnding('剥夺秦王一切兵权')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('秦王府满门抄斩')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('李氏一族族灭')).toBe('coup_fail_captured');
    expect(detectNarrativeEnding('身死族灭，无人幸免')).toBe('coup_fail_captured');
  });

  it('returns deposed for capture keywords', () => {
    expect(detectNarrativeEnding('秦王被幽禁于太极宫')).toBe('deposed');
    expect(detectNarrativeEnding('李世民被囚禁')).toBe('deposed');
    expect(detectNarrativeEnding('世民被捕入狱')).toBe('deposed');
    expect(detectNarrativeEnding('秦王就擒')).toBe('deposed');
    expect(detectNarrativeEnding('秦王被俘于阵前')).toBe('deposed');
  });

  it('returns deposed for exile keywords', () => {
    expect(detectNarrativeEnding('秦王被流放岭南')).toBe('deposed');
    expect(detectNarrativeEnding('李世民被贬谪为庶民')).toBe('deposed');
    expect(detectNarrativeEnding('世民被削爵')).toBe('deposed');
    expect(detectNarrativeEnding('秦王废为庶人')).toBe('deposed');
    expect(detectNarrativeEnding('李世民被逐出长安')).toBe('deposed');
  });

  it('returns null for non-matching text', () => {
    expect(detectNarrativeEnding('秦王与众臣商议军务')).toBeNull();
    expect(detectNarrativeEnding('长孙无忌被幽禁')).toBeNull();
    expect(detectNarrativeEnding('建成设宴款待百官')).toBeNull();
    expect(detectNarrativeEnding('')).toBeNull();
  });

  it('returns null when subject is not 秦王/李世民/世民 for capture/exile', () => {
    expect(detectNarrativeEnding('尉迟敬德被囚禁')).toBeNull();
    expect(detectNarrativeEnding('房玄龄被流放')).toBeNull();
  });

  it('death patterns match regardless of subject', () => {
    expect(detectNarrativeEnding('某人被斩首')).toBe('coup_fail_captured');
  });
});
