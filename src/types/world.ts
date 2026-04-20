import type { PhaseConfig, MemoryEntry } from './index';

// ===== 日历系统 =====

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface CalendarState {
  year: number;              // 武德九年 = 626
  month: number;             // 1-12
  day: number;               // 1-30
  timeOfDay: TimeOfDay;
  daysSinceStart: number;    // 从游戏开始的天数计数
}

// ===== 压力系统 =====

export type PressureAxisId =
  | 'succession_crisis'      // 储位之争总体紧张度
  | 'jiancheng_hostility'    // 建成对秦王的敌意
  | 'yuanji_ambition'        // 元吉的冒进程度
  | 'court_opinion'          // 朝堂舆论对秦王的压力
  | 'qinwangfu_desperation'  // 秦王府众人的急迫感
  | 'imperial_suspicion'     // 李渊对秦王的猜疑
  | 'military_readiness';    // 秦王府军事准备度

export interface PressureAxis {
  id: PressureAxisId;
  value: number;             // 当前值 0-100
  velocity: number;          // 每日漂移速率（可负）
  baseline: number;          // 自然"安息"值，压力向此衰减
  floor: number;             // 最小值（历史结构性下限）
  ceiling: number;           // 最大值
  decayRate: number;         // 每日向 baseline 衰减的速率（0-1，0 = 不衰减，1 = 立即归位）
}

export interface PressureModifier {
  axisId: PressureAxisId;
  delta: number;             // 绝对值变化
  velocityDelta?: number;    // 漂移速率变化
  reason: string;            // 调试/叙事用
  source: string;            // 来源（NPC id、事件 id、活动 id）
}

// ===== 阵营系统 =====

export interface FactionState {
  id: string;                // 'qinwangfu' | 'donggong' | 'imperial'
  influence: number;         // 0-100 朝堂影响力
  alertLevel: number;        // 0-100 对威胁的警觉度
  recentActions: string[];   // 最近 3-5 条行动摘要
}

// ===== NPC Agent =====

/**
 * NPC 立场大类。规则层只定立场，LLM 在立场内自由产出具体 action 文本。
 */
export type NpcStance =
  | 'observe'     // 观望：听朝议、按兵不动
  | 'intel'       // 情报：探亲信、布暗桩
  | 'persuade'    // 温和施压：上书、夜谈、劝谏
  | 'scheme'      // 暗中谋划：串联、立誓
  | 'confront'    // 当面对抗：闯府、质问
  | 'mobilize'    // 动员武力：练兵、点将、藏甲
  | 'breakdown'   // 失控：越级调兵、逼宫秦王（全局限 1 次）
  | 'abandon';    // 出走/被收买：挂冠、投敌（全局限 1 次）

export interface NpcAgentState {
  characterId: string;
  patience: number;          // 0-100，每日自然下降
  alertness: number;         // 0-100，对危险的感知
  commitment: number;        // 0-100，对当前计划的执行力
  currentPlan: string | null;
  recentActions: NpcAction[];
  daysSinceLastAction: number;
  consumedOnceRules?: string[]; // 已消耗的 once 规则 id（breakdown/abandon 用）
}

export interface NpcAction {
  characterId: string;
  stance: NpcStance;
  action: string;            // LLM 自由命名的具体动作，如"夜召秦叔宝点检甲胄"
  description: string;
  target?: string;
  pressureEffects: PressureModifier[];
  triggerEvent?: string;     // 可直接触发某个骨架事件
  narrativeHook?: string;    // 用于日报叙事
  degradeLevel?: 0 | 1 | 2 | 3; // 降级等级：0=合法, 1=矫正, 2=stance降级, 3=回退observe
}

export interface NpcDecisionRule {
  id?: string;               // 规则 id（once 规则必需，用于消耗追踪）
  conditions: {
    patienceBelow?: number;
    patienceAbove?: number;
    pressureAbove?: Partial<Record<PressureAxisId, number>>;
    pressureBelow?: Partial<Record<PressureAxisId, number>>;
    daysSinceLastActionAbove?: number;
    relationshipBelow?: { targetId: string; trust: number };
    relationshipAbove?: { targetId: string; trust: number };
  };
  allowedStances: NpcStance[];
  escalationHint?: string;   // 注入 prompt 的情绪提示
  once?: boolean;            // true = 本规则触发一次后永久失效
  triggerEvent?: string;
}

/**
 * 每 NPC 配置的影响白名单：LLM 提议的 pressureDelta 只有在白名单内才被采纳。
 */
export interface NpcImpactProfile {
  whitelist: PressureAxisId[];
}

// ===== 幕后 Agent（建成/元吉/李渊） =====

export interface OffstageAgent {
  id: string;
  name: string;
  dailyPressureEffects: (state: WorldState) => PressureModifier[];
}

// ===== 事件系统：骨架模板 =====

export interface EventPrecondition {
  type:
    | 'flag'
    | 'pressure_above'
    | 'pressure_below'
    | 'day_range'
    | 'relationship_above'
    | 'relationship_below'
    | 'event_completed'
    | 'event_not_completed'
    | 'npc_patience_below';
  params: Record<string, string | number | boolean>;
}

export interface PressureTrigger {
  axes: Array<{
    axisId: PressureAxisId;
    weight: number;
    threshold: number;
  }>;
  combinedThreshold?: number;
}

export interface PhaseSkeleton {
  role: string;             // '入局' | '激化' | '抉择'
  description: string;      // 阶段功能描述
  turnRange: [number, number];
}

export interface SceneResolution {
  coreConflict: string;          // 高层悬念
  resolutionSignals: string[];   // 收束信号（语义描述）
  softCap: number;               // N 轮后加强结束引导
  hardCap: number;               // 强制结束兜底
}

export interface EventSkeleton {
  id: string;
  category: string;
  description: string;

  preconditions: EventPrecondition[];
  pressureTriggers: PressureTrigger[];
  priority: number;
  cooldownDays: number;
  maxOccurrences: number;

  phaseSkeletons: PhaseSkeleton[];
  resolution: SceneResolution;

  constraints: string[];
  possibleLocations: string[];
  requiredRoles: string[];

  baseOutcomeEffects: PressureModifier[];
}

/** LLM 基于骨架和世界状态生成的具体事件实例 */
export interface EventInstance {
  skeletonId: string;
  name: string;
  location: string;
  activeNpcIds: string[];
  narratorIntro: string;
  phases: PhaseConfig[];
  resolution: SceneResolution;
  pressureSnapshot: Record<PressureAxisId, number>;
  outcomeEffects: PressureModifier[];
}

/** 已完成事件的记录 */
export interface CompletedEvent {
  instanceId: string;
  skeletonId: string;
  name: string;
  day: number;
  summary: string;
  pressureEffects: PressureModifier[];
}

/** 等待触发的事件 */
export interface PendingEvent {
  skeletonId: string;
  triggeredOnDay: number;
  pressureSnapshot: Record<PressureAxisId, number>;
  instance?: EventInstance;   // LLM 生成后填充
}

// ===== 日常活动系统 =====

export type ActivityCategory = 'governance' | 'military' | 'intelligence' | 'social' | 'personal';

export interface ActivityEffect {
  type: 'pressure' | 'relationship' | 'flag' | 'npc_patience';
  params: Record<string, string | number | boolean>;
}

export interface ActivityRequirement {
  type: 'flag' | 'day_range' | 'pressure_range' | 'not_recently_done';
  params: Record<string, string | number>;
}

export interface DailyActivity {
  id: string;
  name: string;
  category: ActivityCategory;
  description: string;
  duration: TimeOfDay;
  effects: ActivityEffect[];
  requirements?: ActivityRequirement[];
  flavorTexts: string[];
}

/** 玩家一天的活动选择 */
export interface DaySchedule {
  morning?: string;          // activity id
  afternoon?: string;
  evening?: string;
}

// ===== 世界状态（顶层） =====

export interface WorldState {
  calendar: CalendarState;
  factions: Record<string, FactionState>;
  pressureAxes: Record<PressureAxisId, PressureAxis>;
  npcAgents: Record<string, NpcAgentState>;
  eventLog: CompletedEvent[];
  pendingEvents: PendingEvent[];
  globalFlags: Record<string, boolean | number | string>;
  characterMemories: Record<string, MemoryEntry[]>;
}

// ===== 前端状态机 =====

export type GameMode =
  | 'title_screen'
  | 'daily_activities'
  | 'daily_briefing'
  | 'event_scene'
  | 'game_over';

export type EndingType =
  | 'coup_success'            // 兵变成功，秦王登基
  | 'coup_fail_captured'      // 兵变失败，被擒被杀
  | 'coup_fail_civil_war_win' // 兵变失败但内战后胜利
  | 'deposed'                 // 隐忍路线，被废/流放/被杀
  | 'peace';                  // 隐忍路线，兄弟和好（极难）

export interface WorldTickResult {
  pressureChanges: PressureModifier[];
  npcActions: NpcAction[];
  triggeredEvents: PendingEvent[];
  dailyBriefing: string;
}
