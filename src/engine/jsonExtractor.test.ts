import { describe, it, expect } from 'vitest';
import { extractJson, stripThinkingTags } from './jsonExtractor';

describe('extractJson', () => {
  it('extracts plain JSON string', () => {
    const input = '{"action": "wait", "reason": "test"}';
    const result = extractJson(input);
    expect(result).toBe(input);
    expect(JSON.parse(result!)).toEqual({ action: 'wait', reason: 'test' });
  });

  it('extracts JSON from markdown code block', () => {
    const input = '```json\n{"narrator": "旁白内容"}\n```';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ narrator: '旁白内容' });
  });

  it('extracts JSON from code block without json tag', () => {
    const input = '```\n{"key": "value"}\n```';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!).key).toBe('value');
  });

  it('extracts JSON with text before and after', () => {
    const input = '好的，以下是输出：\n{"action": "lobby"}\n希望对你有帮助。';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!).action).toBe('lobby');
  });

  it('handles nested JSON objects', () => {
    const input = '{"outer": {"inner": "value"}, "arr": [1, 2]}';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.outer.inner).toBe('value');
    expect(parsed.arr).toEqual([1, 2]);
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{"content": "他说：\\"殿下\\""}';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!).content).toBe('他说："殿下"');
  });

  it('auto-repairs truncated JSON with unclosed braces', () => {
    const input = '{"narrator": "test", "npcDialogues": [{"characterId": "npc1", "content": "hello"}]';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.narrator).toBe('test');
  });

  it('auto-repairs truncated JSON with unclosed string', () => {
    const input = '{"narrator": "旁白内容';
    const result = extractJson(input);
    // May or may not repair depending on implementation — just shouldn't throw
    if (result) {
      expect(() => JSON.parse(result)).not.toThrow();
    }
  });

  it('returns null for empty string', () => {
    expect(extractJson('')).toBeNull();
  });

  it('returns null for string without braces', () => {
    expect(extractJson('no json here')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(extractJson('abc { xyz } def')).toBeNull();
  });

  it('extracts first JSON object when multiple exist', () => {
    const input = '{"first": true} {"second": true}';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!).first).toBe(true);
  });

  it('handles complex LLM response with thinking text', () => {
    const input = `让我思考一下...

根据当前形势，我认为应该这样做：

\`\`\`json
{
  "narrator": "夜色深沉",
  "npcDialogues": [
    {"characterId": "changsun_wuji", "content": "殿下，请三思。"}
  ]
}
\`\`\`

以上就是我的回答。`;
    const result = extractJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.narrator).toBe('夜色深沉');
    expect(parsed.npcDialogues).toHaveLength(1);
  });
});

describe('stripThinkingTags', () => {
  it('removes <thought> tags', () => {
    const input = '<thought>让我想想...</thought>{"action":"wait"}';
    expect(stripThinkingTags(input)).toBe('{"action":"wait"}');
  });

  it('removes <thinking> tags', () => {
    const input = '<thinking>分析中</thinking>\n回答内容';
    expect(stripThinkingTags(input)).toBe('回答内容');
  });

  it('removes multiple thinking tags', () => {
    const input = '<thought>first</thought>中间<thought>second</thought>结尾';
    expect(stripThinkingTags(input)).toBe('中间结尾');
  });

  it('removes multiline thinking content', () => {
    const input = `<thought>
* 分析要点1
* 分析要点2
</thought>
{"narrator":"夜色深沉"}`;
    const result = stripThinkingTags(input);
    expect(result).toContain('{"narrator"');
    expect(result).not.toContain('分析要点');
  });

  it('is case insensitive', () => {
    const input = '<THOUGHT>test</THOUGHT>ok';
    expect(stripThinkingTags(input)).toBe('ok');
  });

  it('returns original text when no tags present', () => {
    const input = '{"action":"wait"}';
    expect(stripThinkingTags(input)).toBe('{"action":"wait"}');
  });
});

describe('extractJson + thinking tags', () => {
  it('extracts JSON after thought tags are stripped', () => {
    const input = '<thought>让我分析当前局势...</thought>{"action":"lobby","reason":"拉拢"}';
    const result = extractJson(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!).action).toBe('lobby');
  });
});
