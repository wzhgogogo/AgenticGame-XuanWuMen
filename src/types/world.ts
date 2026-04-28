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

// ===== Outcome 系统（v3.4.4） =====

/**
 * 事件结局可应用的效果（discriminated union）。
 * 旧 PressureModifier 仍保留独立类型——NPC 行为、活动效果继续使用它。
 * OutcomeEffect 仅用于事件结束时的资产变更（含压力变化的包装形态）。
 */
export type OutcomeEffect =
  | { kind: 'pressure'; modifier: PressureModifier }
  | { kind: 'loseNpc'; characterId: string; status: NpcStatus; reason: string }
  | { kind: 'injureNpc'; characterId: string; commitmentDelta: number; patienceDelta?: number; reason: string }
  | { kind: 'loseOffice'; officeId: OfficeId; reason: string }
  | { kind: 'confiscateMilitary'; ceilingDelta: number; reason: string }
  | { kind: 'flag'; key: string; value: boolean | number | string; reason: string };

/** 骨架候选 outcome：每条带 id 与 tag，LLM 选 chosenOutcome 后按 tag 过滤生效。 */
export type TaggedOutcomeEffect = OutcomeEffect & { id: string; tag: ResolutionTag };

export type ResolutionTag = 'success' | 'partial' | 'failure' | 'disaster';

// ===== 玩家官职（v3.4.4） =====

/**
 * 李世民武德九年实际所任官职 ID。
 * 这些官职可被 imperialSummons / courtImpeachment 等事件通过 loseOffice outcome 剥夺。
 * 官职被剥夺会影响：
 * - 部分活动的 requirements（如"调度天策府"需要 tiance_shangjiang active）
 * - military_readiness ceiling（militaryCeilingContribution 累加为有效上限）
 * - 第 180 天结局判定（多职被剥夺 → F1 政治终局）
 */
export type OfficeId =
  | 'tiance_shangjiang'      // 天策上将（武德四年加，开府置属）
  | 'shangshu_ling'          // 尚书令（实际宰相）
  | 'sikong'                 // 司空（武德八年加）
  | 'yongzhou_mu'            // 雍州牧（关中根基）
  | 'zuo_wuwei_dajiangjun';  // 左武卫大将军（直接兵权）

export interface PlayerOffice {
  id: OfficeId;
  name: string;                                // 显示用中文
  grantedDay: number;                          // 取得日，游戏开始前已有则为 0
  lostDay?: number;                            // 被剥夺日，未剥夺为 undefined
  /** 该官职对 military_readiness ceiling 的贡献（被剥夺时从 ceiling 中减去） */
  militaryCeilingContribution?: number;
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
  // 通用
  | 'observe'       // 观望：听朝议、按兵不动
  // 情报
  | 'plant_spy'     // 安插探子：安排心腹混入东宫、收买宫中内侍
  | 'counterspy'    // 反间搜敌：排查府中可疑人等、清除敌方眼线
  | 'analyze'       // 情报分析+应急响应：解读密报、研判动向、紧急应对
  // 谋略
  | 'advise'        // 温和进言：夜谈献策、上书建议
  | 'remonstrate'   // 强硬劝谏/死谏秦王：跪谏、以死相争
  | 'lobby'         // 对外游说拉拢：联络中立朝臣、争取外部支持
  | 'scheme'        // 对内串联：暗中拉拢府中将领、密约立誓
  | 'coordinate'    // 对外联络：联络府外盟友、与外镇将领通信
  | 'strategize'    // 长期方略谋划：密议大计、拟定方略
  // 武力
  | 'drill'         // 练兵备战：点检甲仗、操练兵马
  | 'rally'         // 动员激励：召集心腹、鼓舞士气
  | 'patrol'        // 巡逻戒备：巡视府卫、加强警戒
  | 'pressure'      // 当面施压（对外）：闯东宫质问、威慑敌方
  | 'defy'          // 越级抗命：擅自调兵、违令行事
  | 'assassinate'   // 安排暗杀：刺杀敌方幕僚、除掉关键人物
  | 'capture'       // 安排抓人：秘密拘押密探、扣留使者
  // 极端
  | 'breakdown'     // 失控破局（一生一次）
  | 'abandon';      // 出走决裂（一生一次）

export interface NpcAgentState {
  characterId: string;
  patience: number;          // 0-100，每日自然下降
  alertness: number;         // 0-100，对危险的感知
  commitment: number;        // 0-100，对当前计划的执行力
  currentPlan: string | null;
  recentActions: NpcAction[];
  daysSinceLastAction: number;
  consumedOnceRules?: string[]; // 已消耗的 once 规则 id（breakdown/abandon 用）
  /** v3.4.4：NPC 资产状态。非 active 的 NPC 不参与每日决策、不进入事件场景。 */
  status?: NpcStatus;
  /** 进入当前 status 的天数（daysSinceStart） */
  statusSince?: number;
  /** 进入当前 status 的叙事原因 */
  statusReason?: string;
}

/**
 * NPC 资产状态。默认 'active' 可决策、可入场景。
 * exiled / imprisoned / deceased / dispatched 均不参与决策、不被 eventGenerator 选入 activeNpcIds。
 * dispatched 与其他状态的差别：派遣远征属于"暂时性"，未来骨架可放回 active；其他三种当前周目内不可逆。
 */
export type NpcStatus = 'active' | 'exiled' | 'imprisoned' | 'deceased' | 'dispatched';

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
    alertnessAbove?: number;
    alertnessBelow?: number;
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

export interface ResolutionSignal {
  /** 该信号对应的 outcome 标签——LLM 选择 chosenOutcome 时按此匹配 */
  outcome: ResolutionTag;
  /** 自然语言描述：什么样的结局走到这个 tag */
  description: string;
}

export interface SceneResolution {
  coreConflict: string;          // 高层悬念
  resolutionSignals: ResolutionSignal[];  // 收束信号（带 outcome 标签）
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
  requiredNpcIds?: string[];

  /** 候选 outcome 池：每条带 id 与 tag，结局时按 chosenOutcome 过滤生效 */
  baseOutcomeEffects: TaggedOutcomeEffect[];
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
  outcomeEffects: TaggedOutcomeEffect[];
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

// ===== 玩家行为日志 =====

/**
 * 玩家主动举动的滑窗记录。
 * 用途三重：
 * 1) NPC / 场景 prompt 注入——让 NPC 感知玩家做过什么
 * 2) autoplay JSON dump 自动带出，供 evalPlaythrough 统计与因果检查
 * 3) DebugPanel 可视化
 */
export interface PlayerAction {
  day: number;              // daysSinceStart
  date: string;             // “武德九年正月初三”
  type: 'activity' | 'event_resolved' | 'event_skipped';
  id: string;               // activity_id / skeleton_id
  name: string;             // 可读名：“批阅奏折” / “元吉宴请”
  category?: ActivityCategory;  // 仅活动有
  summary?: string;         // 一句话摘要（事件结局 / “按下不表”）
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
  /** 角色长期记忆摘要：短期记忆超过阈值时，LLM 提炼旧记忆为数句浓缩文本，永久累加 */
  characterLongTermSummary: Record<string, string>;
  /** 关系值运行时修正：[fromId][toId] = {trustDelta, recentEvents[]}。effective_trust = static + delta，clamp 0-100 */
  relationshipOverrides: Record<string, Record<string, RelationshipOverride>>;
  /** 玩家主动行为滑窗（限容 ~30 条）。写入点：applyActivity / handleEventEnd / “按下不表”。 */
  playerActionLog: PlayerAction[];
  /** v3.4.4：玩家所任官职。被 loseOffice outcome 剥夺后写 lostDay。 */
  playerOffices?: PlayerOffice[];
}

export interface RelationshipOverride {
  /** 累计 trust 变化值，可正可负，应用时与静态 trust 相加后 clamp 到 0-100 */
  trustDelta: number;
  /** 最近导致态度变化的 3-5 条原因，每条 ≤15 字 */
  recentEvents: string[];
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
