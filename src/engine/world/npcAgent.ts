import type {
  NpcAgentState,
  NpcAction,
  NpcDecisionRule,
  NpcStance,
  WorldState,
  PressureAxisId,
} from '../../types/world';
import type { Character } from '../../types';

// ===== NPC Agent 决策引擎 =====

export interface PlausibleActions {
  allowedStances: NpcStance[];
  escalationHints: string[];
  triggerEvent?: string;
  matchedRuleIds: string[];      // 命中的规则 id（用于 once 消耗追踪）
  onceRuleIds: string[];         // 其中属于 once 类型的规则 id
}

/**
 * 阶段1：确定性过滤
 * 根据 NPC 当前状态和世界状态，判断 LLM 可选的 stance 清单
 */
export function filterPlausibleActions(
  agentState: NpcAgentState,
  rules: NpcDecisionRule[],
  worldState: WorldState,
  character: Character,
): PlausibleActions {
  const stances: NpcStance[] = [];
  const hints: string[] = [];
  const matchedRuleIds: string[] = [];
  const onceRuleIds: string[] = [];
  let triggerEvent: string | undefined;

  const consumed = new Set(agentState.consumedOnceRules ?? []);

  for (const rule of rules) {
    if (rule.once && rule.id && consumed.has(rule.id)) continue;
    if (!matchConditions(rule.conditions, agentState, worldState, character)) continue;

    stances.push(...rule.allowedStances);
    if (rule.escalationHint) hints.push(rule.escalationHint);
    if (rule.id) matchedRuleIds.push(rule.id);
    if (rule.once && rule.id) onceRuleIds.push(rule.id);
    if (rule.triggerEvent) triggerEvent = rule.triggerEvent;
  }

  const uniqueStances = [...new Set(stances)];
  if (uniqueStances.length === 0) {
    uniqueStances.push('observe');
  }

  return {
    allowedStances: uniqueStances,
    escalationHints: hints,
    triggerEvent,
    matchedRuleIds,
    onceRuleIds,
  };
}

function matchConditions(
  conditions: NpcDecisionRule['conditions'],
  agent: NpcAgentState,
  world: WorldState,
  character: Character,
): boolean {
  if (conditions.patienceBelow !== undefined && agent.patience >= conditions.patienceBelow) return false;
  if (conditions.patienceAbove !== undefined && agent.patience < conditions.patienceAbove) return false;

  if (conditions.daysSinceLastActionAbove !== undefined &&
    agent.daysSinceLastAction <= conditions.daysSinceLastActionAbove) return false;

  if (conditions.pressureAbove) {
    for (const [axisId, threshold] of Object.entries(conditions.pressureAbove)) {
      const axis = world.pressureAxes[axisId as PressureAxisId];
      if (!axis || axis.value < threshold!) return false;
    }
  }

  if (conditions.pressureBelow) {
    for (const [axisId, threshold] of Object.entries(conditions.pressureBelow)) {
      const axis = world.pressureAxes[axisId as PressureAxisId];
      if (!axis || axis.value >= threshold!) return false;
    }
  }

  if (conditions.relationshipBelow) {
    const rel = character.relationships[conditions.relationshipBelow.targetId];
    if (!rel || rel.trust >= conditions.relationshipBelow.trust) return false;
  }

  if (conditions.relationshipAbove) {
    const rel = character.relationships[conditions.relationshipAbove.targetId];
    if (!rel || rel.trust < conditions.relationshipAbove.trust) return false;
  }

  return true;
}

/**
 * 每日 tick：更新 NPC agent 状态（耐心衰减等）
 */
export function tickNpcAgent(
  agent: NpcAgentState,
  patienceDecayRate: number,
): NpcAgentState {
  return {
    ...agent,
    patience: Math.max(0, agent.patience - patienceDecayRate),
    daysSinceLastAction: agent.daysSinceLastAction + 1,
  };
}

/**
 * 记录 NPC 执行了一个行动后的状态更新
 */
export function recordNpcAction(
  agent: NpcAgentState,
  action: NpcAction,
): NpcAgentState {
  const recentActions = [...agent.recentActions, action].slice(-5);
  return {
    ...agent,
    recentActions,
    daysSinceLastAction: 0,
  };
}

/**
 * 消耗 once 规则（将 ruleId 追加到 consumedOnceRules）
 */
export function consumeOnceRule(
  agent: NpcAgentState,
  ruleId: string,
): NpcAgentState {
  const consumed = new Set(agent.consumedOnceRules ?? []);
  consumed.add(ruleId);
  return { ...agent, consumedOnceRules: [...consumed] };
}

/**
 * 玩家行动对 NPC 耐心的影响
 */
export function adjustPatience(
  agent: NpcAgentState,
  delta: number,
): NpcAgentState {
  return {
    ...agent,
    patience: Math.max(0, Math.min(100, agent.patience + delta)),
  };
}
