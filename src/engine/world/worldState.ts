import type {
  WorldState,
  FactionState,
  NpcAgentState,
  PressureAxisId,
} from '../../types/world';
import { createCalendar } from './calendar';
import { createDefaultPressureAxes } from './pressure';
import { LI_SHIMIN_INITIAL_OFFICES } from '../../data/characters/liShimin';

// ===== 阵营初始配置 =====

function createDefaultFactions(): Record<string, FactionState> {
  return {
    qinwangfu: {
      id: 'qinwangfu',
      influence: 40,
      alertLevel: 30,
      recentActions: [],
    },
    donggong: {
      id: 'donggong',
      influence: 55,
      alertLevel: 20,
      recentActions: [],
    },
    imperial: {
      id: 'imperial',
      influence: 100,
      alertLevel: 10,
      recentActions: [],
    },
  };
}

// ===== NPC Agent 初始状态 =====

interface NpcAgentConfig {
  characterId: string;
  initialPatience: number;
  initialAlertness: number;
  initialCommitment: number;
}

const DEFAULT_NPC_AGENT_CONFIGS: NpcAgentConfig[] = [
  {
    characterId: 'changsun_wuji',
    initialPatience: 70,      // 谨慎隐忍
    initialAlertness: 60,
    initialCommitment: 75,
  },
  {
    characterId: 'weichi_jingde',
    initialPatience: 45,      // 性急如火
    initialAlertness: 50,
    initialCommitment: 90,
  },
  {
    characterId: 'fang_xuanling',
    initialPatience: 80,      // 老成持重
    initialAlertness: 55,
    initialCommitment: 70,
  },
  {
    characterId: 'li_jiancheng',
    initialPatience: 60,      // 太子有正统压力，但仍有政治理性
    initialAlertness: 75,     // 对秦王动向高度警觉
    initialCommitment: 80,    // 已决意打压秦王
  },
  {
    characterId: 'li_yuanji',
    initialPatience: 35,      // 急躁好战
    initialAlertness: 50,
    initialCommitment: 95,    // 表面誓死跟随大哥
  },
  {
    characterId: 'li_yuan',
    initialPatience: 80,      // 帝王最沉稳
    initialAlertness: 60,
    initialCommitment: 50,    // 不偏向任何一子
  },
];

function createDefaultNpcAgents(): Record<string, NpcAgentState> {
  const agents: Record<string, NpcAgentState> = {};
  for (const config of DEFAULT_NPC_AGENT_CONFIGS) {
    agents[config.characterId] = {
      characterId: config.characterId,
      patience: config.initialPatience,
      alertness: config.initialAlertness,
      commitment: config.initialCommitment,
      currentPlan: null,
      recentActions: [],
      daysSinceLastAction: 0,
      status: 'active',
    };
  }
  return agents;
}

// ===== 创建初始世界状态 =====

export function createInitialWorldState(): WorldState {
  return {
    calendar: createCalendar(1, 1),  // 武德九年正月初一
    factions: createDefaultFactions(),
    pressureAxes: createDefaultPressureAxes(),
    npcAgents: createDefaultNpcAgents(),
    eventLog: [],
    pendingEvents: [],
    globalFlags: {},
    characterMemories: {},
    characterLongTermSummary: {},
    relationshipOverrides: {},
    playerActionLog: [],
    playerOffices: LI_SHIMIN_INITIAL_OFFICES.map((o) => ({ ...o })),
  };
}

// ===== 序列化 / 反序列化（localStorage 存档） =====

const SAVE_KEY = 'xuanwumen_world_state';

export function saveWorldState(state: WorldState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, serialized);
  } catch {
    console.warn('Failed to save world state');
  }
}

export function loadWorldState(): WorldState | null {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) return null;
    const raw = JSON.parse(serialized);
    return migrateWorldState(raw);
  } catch {
    console.warn('Failed to load world state');
    return null;
  }
}

/**
 * 旧存档懒补全（v3.4.4）。
 * - npcAgents[].status 缺失补 'active'
 * - playerOffices 缺失补初始 5 官职
 * 未来字段扩展时统一在此处补全，不让消费方处理 undefined。
 */
function migrateWorldState(raw: WorldState): WorldState {
  const next: WorldState = { ...raw };

  if (next.npcAgents) {
    const updated: Record<string, NpcAgentState> = {};
    for (const id in next.npcAgents) {
      const agent = next.npcAgents[id];
      updated[id] = agent.status ? agent : { ...agent, status: 'active' };
    }
    next.npcAgents = updated;
  }

  if (!next.playerOffices) {
    next.playerOffices = LI_SHIMIN_INITIAL_OFFICES.map((o) => ({ ...o }));
  }

  return next;
}

export function clearSavedWorldState(): void {
  localStorage.removeItem(SAVE_KEY);
}

// ===== 玩家行为日志 =====

const PLAYER_ACTION_LOG_MAX = 30;

/** 向 playerActionLog 追加一条，自动滑窗到 MAX。 */
export function appendPlayerAction(
  log: WorldState['playerActionLog'] | undefined,
  action: import('../../types/world').PlayerAction,
): WorldState['playerActionLog'] {
  const base = log ?? [];
  const next = [...base, action];
  if (next.length > PLAYER_ACTION_LOG_MAX) {
    return next.slice(-PLAYER_ACTION_LOG_MAX);
  }
  return next;
}

/** 取最近 N 天的行为（按 day 过滤，非条数）。 */
export function getRecentPlayerActions(
  state: Pick<WorldState, 'playerActionLog' | 'calendar'>,
  days: number,
): WorldState['playerActionLog'] {
  const log = state.playerActionLog ?? [];
  const cutoff = state.calendar.daysSinceStart - days;
  return log.filter((a) => a.day >= cutoff);
}

// ===== 状态查询工具 =====

/** 获取压力值（便捷方法） */
export function getPressure(state: WorldState, axisId: PressureAxisId): number {
  return state.pressureAxes[axisId]?.value ?? 0;
}

/**
 * 计算 fromId 对 toId 的有效信任度。
 * effective = staticTrust + delta，clamp 到 0-100。
 * state 为空或 overrides 不存在时直接返回 staticTrust。
 */
export function getEffectiveTrust(
  state: { relationshipOverrides?: WorldState['relationshipOverrides'] } | null | undefined,
  fromId: string,
  toId: string,
  staticTrust: number,
): { value: number; delta: number; recentEvents: string[] } {
  const override = state?.relationshipOverrides?.[fromId]?.[toId];
  const delta = override?.trustDelta ?? 0;
  return {
    value: Math.max(0, Math.min(100, staticTrust + delta)),
    delta,
    recentEvents: override?.recentEvents ?? [],
  };
}

/** 获取压力轴的定性描述 */
export function getPressureLabel(value: number): string {
  if (value >= 80) return '极高';
  if (value >= 60) return '高';
  if (value >= 40) return '中';
  if (value >= 20) return '低';
  return '极低';
}

/** 压力轴中文名 */
export const PRESSURE_AXIS_LABELS: Record<PressureAxisId, string> = {
  succession_crisis: '储位之争',
  jiancheng_hostility: '东宫敌意',
  yuanji_ambition: '齐王冒进',
  court_opinion: '朝堂舆论',
  qinwangfu_desperation: '府中急迫',
  imperial_suspicion: '天子猜疑',
  military_readiness: '军事准备',
};

/** 生成世界状态的简要中文摘要（给 LLM 用） */
export function buildWorldStateSummary(state: WorldState): string {
  const lines: string[] = [];

  lines.push(`日期：武德九年 第${state.calendar.daysSinceStart}天`);
  lines.push('');
  lines.push('当前形势：');

  for (const axisId of Object.keys(state.pressureAxes) as PressureAxisId[]) {
    const axis = state.pressureAxes[axisId];
    const label = PRESSURE_AXIS_LABELS[axisId];
    const level = getPressureLabel(axis.value);
    lines.push(`  ${label}：${Math.round(axis.value)}/100（${level}）`);
  }

  // NPC 状态
  lines.push('');
  lines.push('秦王府众人：');
  for (const agentId of Object.keys(state.npcAgents)) {
    const agent = state.npcAgents[agentId];
    const patienceLabel = getPressureLabel(agent.patience);
    lines.push(`  ${agentId}：耐心${Math.round(agent.patience)}/100（${patienceLabel}），承诺${Math.round(agent.commitment)}/100`);
  }

  // 最近事件
  if (state.eventLog.length > 0) {
    lines.push('');
    lines.push('近期事件：');
    const recent = state.eventLog.slice(-3);
    for (const event of recent) {
      lines.push(`  [第${event.day}天] ${event.name}：${event.summary}`);
    }
  }

  return lines.join('\n');
}
