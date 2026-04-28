/**
 * LLM 输出验证器 — 与 callLLMWithRetry 的 validator 接口配合使用。
 *
 * 提供的原语：
 * - forbiddenWordsValidator：拒绝包含穿越词/后世词/错误结局词的输出
 * - jsonValidator：确保能提取出合法 JSON（可选 schema 回调）
 * - combineValidators：串接多个 validator，任一失败即失败
 *
 * 运行时只做硬错误检测（禁用词 + JSON 格式）。称谓规则误报率高、
 * 模型常自我修正，留给 evalPlaythrough 做后验分析，不在运行时阻断。
 */

import type { ValidatorResult } from './retry';
import { extractJson, stripThinkingTags } from '../jsonExtractor';

export type Validator = (content: string) => ValidatorResult;

/**
 * 运行时禁用词：历史跳跃 / 虚构结局 / 后世称谓。
 * 与 scripts/evalPlaythrough.ts 的 BANNED_WORDS 保持同步（硬错误子集）。
 */
export const RUNTIME_BANNED_WORDS: readonly string[] = [
  // 后世事件/称号
  '玄武门之变', '血洗玄武门', '太宗', '贞观', '天可汗', '贞观之治',
  '李承乾', '凌烟阁', '天策上将府',
  // 虚构结局（尚未发生）
  '即位', '登基', '登极', '践祚', '继位', '入继大统',
  '新君', '夺位', '政变成功', '兵变成功', '大业已成',
  // 后世/穿越称谓
  '皇上', '万岁爷', '圣天子',
];

/** 创建禁用词 validator。默认使用 RUNTIME_BANNED_WORDS。 */
export function forbiddenWordsValidator(words: readonly string[] = RUNTIME_BANNED_WORDS): Validator {
  return (content: string) => {
    const text = stripThinkingTags(content);
    for (const w of words) {
      if (text.includes(w)) {
        return { ok: false, reason: `禁用词命中："${w}"` };
      }
    }
    return { ok: true };
  };
}

/**
 * 创建 JSON validator。要求能提取出合法 JSON；可选 schema 回调做进一步结构检查。
 * schema 回调：合法返回 null，不合法返回错误原因字符串。
 */
export function jsonValidator(
  schema?: (parsed: unknown) => string | null,
): Validator {
  return (content: string) => {
    const jsonStr = extractJson(content);
    if (!jsonStr) return { ok: false, reason: '未能提取到 JSON 块' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      return { ok: false, reason: `JSON 解析失败：${(e as Error).message}` };
    }
    if (schema) {
      const reason = schema(parsed);
      if (reason) return { ok: false, reason };
    }
    return { ok: true };
  };
}

/** 串接多个 validator；按顺序运行，首个失败即返回。 */
export function combineValidators(...validators: Validator[]): Validator {
  return (content: string) => {
    for (const v of validators) {
      const r = v(content);
      if (!r.ok) return r;
    }
    return { ok: true };
  };
}
