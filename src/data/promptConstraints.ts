/**
 * LLM prompt 约束中枢 — 所有历史事实、称谓规则、叙事节奏约束的唯一来源。
 *
 * 两层设计：
 *   历史事实层（HISTORICAL_CONTEXT / NAMING_RULES）— 永远不变
 *   叙事节奏层（intensityConstraint）— 由 pressure.ts getNarrativeIntensity() 动态返回
 *
 * 消费方通过 buildConstraintBlock() 一次拿到完整约束，不再自己拼字符串。
 */

/** 紧凑版人物表 + 禁用词（~60 tokens，适合 NPC 决策 / 事件生成等短 prompt） */
export const HISTORICAL_CONTEXT = `武德九年（626年）人物表：皇帝=李渊，太子=李建成，秦王=李世民，齐王=李元吉，淮安王=李神通。
秦王府核心：长孙无忌、尉迟敬德（字敬德）、房玄龄。
禁用词（均属后世或尚未发生，此时不得提及）：李承乾、太宗、贞观、天可汗、玄武门之变、血洗玄武门、即位、登基、入继大统。`;

/** 详细称谓规则（场景对话 prompt 专用，需要更细粒度的称呼规范） */
export const NAMING_RULES = `===== 称谓与人物关系规则（所有角色必须遵守） =====

正式称谓：
NPC称呼皇帝李渊→"陛下"或"圣上"。
NPC称呼太子李建成→"太子"或"太子殿下"。
NPC称呼齐王李元吉→"齐王"。
NPC称呼秦王李世民→"殿下"或"秦王"。
NPC称呼淮安王李神通→"淮安王"。

亲属称呼（仅限玩家角色李世民使用）：
李世民称李渊→"父皇"。
李世民称李建成→"大哥"或"太子"。
李世民称李元吉→"四弟"或"齐王"。
李世民称李神通→"叔父"。

其他皇族互称：
李建成称李世民→"二郎"或"秦王"。
李元吉称李世民→"二哥"或"秦王"。
李神通称李世民→"世民"或"秦王"（叔侄关系，非兄弟）。

配角行为规范：
旁白中出现的非NPC人物（如李神通、傅奕、李建成、李元吉等）须符合其历史身份和地位。皇族成员不可出现跪求、哀求等不合身份的描写。`;

/**
 * 组装完整约束块。
 * @param dateStr  当前日期文本，如 "武德九年正月初三"
 * @param intensityConstraint  叙事烈度约束文本（来自 getNarrativeIntensity().constraint）
 * @param detailed  true = 场景对话（注入详细称谓），false = NPC 决策/事件生成（紧凑版）
 */
export function buildConstraintBlock(
  dateStr: string,
  intensityConstraint: string,
  detailed = false,
): string {
  const parts: string[] = [];

  parts.push(HISTORICAL_CONTEXT);

  if (detailed) {
    parts.push(NAMING_RULES);
  } else {
    parts.push('称呼规则：NPC称皇帝为"陛下"或"圣上"，称太子为"太子"，秦王府属下称秦王李世民为"殿下"或"秦王"；李建成称李世民为"二郎"或"秦王"，李元吉称李世民为"二哥"或"秦王"（不可用"殿下"，那是下属称呼）。');
  }

  parts.push(`当前日期：${dateStr}。${intensityConstraint}禁止时间跳跃。`);

  return parts.join('\n');
}
