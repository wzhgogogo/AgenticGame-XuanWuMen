import type {
  NpcAgentState,
  NpcAction,
  NpcDecisionRule,
  NpcActionType,
  PressureModifier,
  WorldState,
  PressureAxisId,
} from '../../types/world';
import type { Character } from '../../types';

// ===== NPC Agent 决策引擎 =====

/**
 * 阶段1：确定性过滤
 * 根据 NPC 当前状态和世界状态，判断哪些行动类型是合理的
 */
export function filterPlausibleActions(
  agentState: NpcAgentState,
  rules: NpcDecisionRule[],
  worldState: WorldState,
  character: Character,
): { enabledActions: NpcActionType[]; autoEffects: PressureModifier[]; triggerEvent?: string } {
  const allEnabled: NpcActionType[] = [];
  const allEffects: PressureModifier[] = [];
  let triggerEvent: string | undefined;

  for (const rule of rules) {
    if (!matchConditions(rule.conditions, agentState, worldState, character)) continue;

    allEnabled.push(...rule.enabledActions);
    allEffects.push(...rule.basePressureEffects);
    if (rule.triggerEvent) {
      triggerEvent = rule.triggerEvent;
    }
  }

  // 去重
  const uniqueActions = [...new Set(allEnabled)];

  // 如果没有任何规则命中，默认 wait
  if (uniqueActions.length === 0) {
    uniqueActions.push('wait');
  }

  return { enabledActions: uniqueActions, autoEffects: allEffects, triggerEvent };
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
