import type {
  WorldState,
  FactionState,
  NpcAgentState,
  PressureAxisId,
} from '../../types/world';
import { createCalendar } from './calendar';
import { createDefaultPressureAxes } from './pressure';

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
    return JSON.parse(serialized) as WorldState;
  } catch {
    console.warn('Failed to load world state');
    return null;
  }
}

export function clearSavedWorldState(): void {
  localStorage.removeItem(SAVE_KEY);
}

// ===== 状态查询工具 =====

/** 获取压力值（便捷方法） */
export function getPressure(state: WorldState, axisId: PressureAxisId): number {
  return state.pressureAxes[axisId]?.value ?? 0;
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
