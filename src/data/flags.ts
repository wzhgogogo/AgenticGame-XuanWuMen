/**
 * 全局 flag 白名单（v3.4.4）。
 *
 * 仅在此处声明的 key 才能通过 OutcomeEffect.flag 写入 WorldState.globalFlags。
 * 防止状态空间膨胀——LLM 与骨架设计者不能任意造 flag。
 *
 * 添加新 flag 时三步走：
 *   1) 在此 union 加字面量
 *   2) 在 ALL_FLAG_KEYS 数组里加同一字面量
 *   3) 在调用方（骨架的 outcome / 活动的 effect / 时间窗触发器）使用
 */

export type FlagKey =
  // 朝堂打压链
  | 'impeached_severely'        // courtImpeachment 走 disaster：被严重弹劾，多职被夺
  | 'counterstrike_succeeded'   // courtCounterstrike 走 success：反击得手
  | 'counterstrike_failed'      // courtCounterstrike 走 failure：反击溃败
  // 军事
  | 'tujue_invasion'            // 突厥犯边时间窗（约第 60-90 天种入），seizeMilitaryCommand 前置
  | 'military_stripped'         // seizeMilitaryCommand 走 failure：兵权被夺
  // 自身状态
  | 'shimin_injured'            // assassinationCrisis 走 disaster：秦王受重伤
  // 内部裂痕
  | 'commitment_collapse'       // subordinateUltimatum 走 failure：核心团队信心崩盘
  // 对外妥协
  | 'dispatch_to_luoyang'       // imperialSummons 走 failure：被命出镇洛阳（直接走向 F1）
  // 情报
  | 'false_intel_acted_on';     // intelligenceEvent 走 failure：依据假情报行动

export const ALL_FLAG_KEYS: readonly FlagKey[] = [
  'impeached_severely',
  'counterstrike_succeeded',
  'counterstrike_failed',
  'tujue_invasion',
  'military_stripped',
  'shimin_injured',
  'commitment_collapse',
  'dispatch_to_luoyang',
  'false_intel_acted_on',
] as const;

export function isValidFlagKey(key: string): key is FlagKey {
  return (ALL_FLAG_KEYS as readonly string[]).includes(key);
}
