import { describe, it, expect } from 'vitest';
import {
  forbiddenWordsValidator,
  jsonValidator,
  combineValidators,
  RUNTIME_BANNED_WORDS,
} from '../validators';

describe('forbiddenWordsValidator', () => {
  it('accepts clean content', () => {
    const v = forbiddenWordsValidator();
    expect(v('秦王殿下夜召长孙无忌议事').ok).toBe(true);
  });

  it('rejects content with banned words', () => {
    const v = forbiddenWordsValidator();
    const r = v('殿下已经即位，天下归心');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('即位');
  });

  it('rejects posthumous title', () => {
    const v = forbiddenWordsValidator();
    expect(v('贞观年间...').ok).toBe(false);
  });

  it('ignores thinking tags', () => {
    const v = forbiddenWordsValidator();
    // 思考标签里的禁用词不算（虽然实际很少见，但体现 stripThinking 行为）
    const r = v('<thinking>想到玄武门之变</thinking>殿下需谨慎');
    expect(r.ok).toBe(true);
  });

  it('accepts custom word list', () => {
    const v = forbiddenWordsValidator(['龙椅']);
    expect(v('坐上龙椅').ok).toBe(false);
    expect(v('即位').ok).toBe(true); // 自定义列表不含默认词
  });

  it('RUNTIME_BANNED_WORDS covers key posthumous terms', () => {
    expect(RUNTIME_BANNED_WORDS).toContain('玄武门之变');
    expect(RUNTIME_BANNED_WORDS).toContain('太宗');
    expect(RUNTIME_BANNED_WORDS).toContain('即位');
  });
});

describe('jsonValidator', () => {
  it('accepts plain JSON', () => {
    const v = jsonValidator();
    expect(v('{"a":1}').ok).toBe(true);
  });

  it('accepts JSON in markdown code block', () => {
    const v = jsonValidator();
    expect(v('```json\n{"a":1}\n```').ok).toBe(true);
  });

  it('rejects non-JSON', () => {
    const v = jsonValidator();
    const r = v('just some text with no braces');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('JSON');
  });

  it('rejects malformed JSON', () => {
    const v = jsonValidator();
    const r = v('{"a":}');
    expect(r.ok).toBe(false);
  });

  it('runs schema check on parsed JSON', () => {
    const v = jsonValidator((parsed) => {
      const p = parsed as { name?: string };
      return p.name ? null : '缺少 name';
    });
    expect(v('{"name":"foo"}').ok).toBe(true);
    const r = v('{"other":1}');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('缺少 name');
  });
});

describe('combineValidators', () => {
  it('passes when all pass', () => {
    const v = combineValidators(
      forbiddenWordsValidator(),
      jsonValidator(),
    );
    expect(v('{"msg":"殿下平安"}').ok).toBe(true);
  });

  it('fails with first failure reason', () => {
    const v = combineValidators(
      forbiddenWordsValidator(),
      jsonValidator(),
    );
    const r = v('{"msg":"即位之后"}');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('即位');
  });

  it('second validator failure surfaces', () => {
    const v = combineValidators(
      forbiddenWordsValidator(),
      jsonValidator(),
    );
    const r = v('not json but clean');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('JSON');
  });

  it('empty combine always passes', () => {
    const v = combineValidators();
    expect(v('anything').ok).toBe(true);
  });
});
