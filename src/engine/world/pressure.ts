import type {
  PressureAxis,
  PressureAxisId,
  PressureModifier,
  WorldState,
  EventSkeleton,
  PendingEvent,
  EventPrecondition,
  PressureTrigger,
  OutcomeEffect,
  NpcAgentState,
  PlayerOffice,
} from '../../types/world';
import { isValidFlagKey } from '../../data/flags';

// ===== 压力轴初始配置 =====

export interface PressureAxisConfig {
  id: PressureAxisId;
  initialValue: number;
  velocity: number;
  baseline: number;
  floor: number;
  ceiling: number;
  decayRate: number;
}

export const DEFAULT_PRESSURE_CONFIGS: PressureAxisConfig[] = [
  { id: 'succession_crisis',     initialValue: 45, velocity: 0.6,  baseline: 70, floor: 30, ceiling: 100, decayRate: 0.05 },
  { id: 'jiancheng_hostility',   initialValue: 40, velocity: 1.0,  baseline: 55, floor: 20, ceiling: 100, decayRate: 0.03 },
  { id: 'yuanji_ambition',       initialValue: 35, velocity: 0.6,  baseline: 45, floor: 15, ceiling: 100, decayRate: 0.04 },
  { id: 'court_opinion',         initialValue: 30, velocity: 0.4,  baseline: 40, floor: 10, ceiling: 100, decayRate: 0.05 },
  { id: 'qinwangfu_desperation', initialValue: 25, velocity: 0.6,  baseline: 35, floor: 10, ceiling: 100, decayRate: 0.04 },
  { id: 'imperial_suspicion',    initialValue: 20, velocity: 0.4,  baseline: 30, floor: 10, ceiling: 100, decayRate: 0.05 },
  { id: 'military_readiness',    initialValue: 20, velocity: -0.1, baseline: 20, floor: 0,  ceiling: 100, decayRate: 0.03 },
];

// ===== 创建压力轴 =====

export function createPressureAxis(config: PressureAxisConfig): PressureAxis {
  return {
    id: config.id,
    value: config.initialValue,
    velocity: config.velocity,
    baseline: config.baseline,
    floor: config.floor,
    ceiling: config.ceiling,
    decayRate: config.decayRate,
  };
}

export function createDefaultPressureAxes(): Record<PressureAxisId, PressureAxis> {
  const axes = {} as Record<PressureAxisId, PressureAxis>;
  for (const config of DEFAULT_PRESSURE_CONFIGS) {
    axes[config.id] = createPressureAxis(config);
  }
  return axes;
}

// ===== 每日压力 tick =====

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 单条压力轴的每日 tick：
 * 1. 加上 velocity（自然漂移）
 * 2. 向 baseline 衰减
 * 3. 钳位到 [floor, ceiling]
 */
export function tickAxis(axis: PressureAxis): PressureAxis {
  let newValue = axis.value + axis.velocity;

  // 向 baseline 衰减：当前值和 baseline 之差按 decayRate 缩小
  const diff = newValue - axis.baseline;
  newValue = newValue - diff * axis.decayRate;

  newValue = clamp(newValue, axis.floor, axis.ceiling);

  return { ...axis, value: newValue };
}

/**
 * 对所有压力轴执行每日 tick（纯函数）
 */
export function tickPressure(
  axes: Record<PressureAxisId, PressureAxis>,
): Record<PressureAxisId, PressureAxis> {
  const result = { ...axes };
  for (const id of Object.keys(result) as PressureAxisId[]) {
    result[id] = tickAxis(result[id]);
  }
  return result;
}

// ===== 应用压力修改器 =====

/**
 * 应用一组压力修改器（纯函数）
 */
export function applyPressureModifiers(
  axes: Record<PressureAxisId, PressureAxis>,
  modifiers: PressureModifier[],
): Record<PressureAxisId, PressureAxis> {
  const result = { ...axes };

  for (const mod of modifiers) {
    const axis = result[mod.axisId];
    if (!axis) continue;

    let newValue = axis.value + mod.delta;
    let newVelocity = axis.velocity;

    if (mod.velocityDelta !== undefined) {
      newVelocity = axis.velocity + mod.velocityDelta;
    }

    newValue = clamp(newValue, axis.floor, axis.ceiling);

    result[mod.axisId] = {
      ...axis,
      value: newValue,
      velocity: newVelocity,
    };
  }

  return result;
}

// ===== 应用 Outcome（v3.4.4 单一入口） =====

/**
 * 应用一组 OutcomeEffect 到完整 WorldState（纯函数）。
 * 单一入口取代散落的 setter——事件结束、骨架触发、未来扩展（活动 outcome）都走它。
 *
 * pressure 分支复用既有 applyPressureModifiers，其他分支按 kind 分派各自处理函数。
 * 未知 kind 不会抛错（前向兼容旧存档），只在控制台 warn。
 */
export function applyOutcomeEffects(state: WorldState, effects: OutcomeEffect[]): WorldState {
  let next = state;
  for (const effect of effects) {
    next = applySingleOutcome(next, effect);
  }
  return next;
}

const QINWANGFU_ALLIES = ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'] as const;

function resolveNpcTarget(state: WorldState, characterId: string): string | null {
  const agent = state.npcAgents[characterId];
  if (agent && agent.status === 'active') return characterId;
  for (const id of QINWANGFU_ALLIES) {
    if (id === characterId) continue;
    const a = state.npcAgents[id];
    if (a && a.status === 'active') return id;
  }
  return null;
}

function applySingleOutcome(state: WorldState, effect: OutcomeEffect): WorldState {
  switch (effect.kind) {
    case 'pressure':
      return {
        ...state,
        pressureAxes: applyPressureModifiers(state.pressureAxes, [effect.modifier]),
      };
    case 'loseNpc': {
      const target = resolveNpcTarget(state, effect.characterId);
      if (!target) return state;
      return applyLoseNpc(state, target, effect.status, effect.reason);
    }
    case 'injureNpc': {
      const target = resolveNpcTarget(state, effect.characterId);
      if (!target) return state;
      return applyInjureNpc(
        state,
        target,
        effect.commitmentDelta,
        effect.patienceDelta ?? 0,
      );
    }
    case 'loseOffice':
      return applyLoseOffice(state, effect.officeId, effect.reason);
    case 'confiscateMilitary':
      return applyConfiscateMilitary(state, effect.ceilingDelta);
    case 'flag':
      if (!isValidFlagKey(effect.key)) {
        console.warn(`[outcome] flag key not in whitelist: ${effect.key}`);
        return state;
      }
      return {
        ...state,
        globalFlags: { ...state.globalFlags, [effect.key]: effect.value },
      };
    default: {
      const _exhaustive: never = effect;
      void _exhaustive;
      return state;
    }
  }
}

function applyLoseNpc(
  state: WorldState,
  characterId: string,
  status: NpcAgentState['status'],
  reason: string,
): WorldState {
  const agent = state.npcAgents[characterId];
  if (!agent) return state;
  return {
    ...state,
    npcAgents: {
      ...state.npcAgents,
      [characterId]: {
        ...agent,
        status,
        statusSince: state.calendar.daysSinceStart,
        statusReason: reason,
      },
    },
  };
}

function applyInjureNpc(
  state: WorldState,
  characterId: string,
  commitmentDelta: number,
  patienceDelta: number,
): WorldState {
  const agent = state.npcAgents[characterId];
  if (!agent) return state;
  return {
    ...state,
    npcAgents: {
      ...state.npcAgents,
      [characterId]: {
        ...agent,
        commitment: clamp(agent.commitment + commitmentDelta, 0, 100),
        patience: clamp(agent.patience + patienceDelta, 0, 100),
      },
    },
  };
}

function applyLoseOffice(state: WorldState, officeId: PlayerOffice['id'], _reason: string): WorldState {
  const offices = state.playerOffices ?? [];
  let ceilingPenalty = 0;
  const updatedOffices = offices.map((o) => {
    if (o.id !== officeId || o.lostDay !== undefined) return o;
    ceilingPenalty += o.militaryCeilingContribution ?? 0;
    return { ...o, lostDay: state.calendar.daysSinceStart };
  });

  let next: WorldState = { ...state, playerOffices: updatedOffices };
  if (ceilingPenalty > 0) {
    next = applyConfiscateMilitary(next, -ceilingPenalty);
  }
  return next;
}

function applyConfiscateMilitary(state: WorldState, ceilingDelta: number): WorldState {
  const axis = state.pressureAxes.military_readiness;
  if (!axis) return state;
  const newCeiling = clamp(axis.ceiling + ceilingDelta, axis.floor, 100);
  const newValue = Math.min(axis.value, newCeiling);
  return {
    ...state,
    pressureAxes: {
      ...state.pressureAxes,
      military_readiness: { ...axis, ceiling: newCeiling, value: newValue },
    },
  };
}

/**
 * 从 OutcomeEffect 数组提取 PressureModifier 子集，用于 eventLog.pressureEffects 兼容字段。
 */
export function extractPressureModifiers(effects: OutcomeEffect[]): PressureModifier[] {
  const result: PressureModifier[] = [];
  for (const e of effects) {
    if (e.kind === 'pressure') result.push(e.modifier);
  }
  return result;
}

// ===== 压力快照 =====

export function snapshotPressure(
  axes: Record<PressureAxisId, PressureAxis>,
): Record<PressureAxisId, number> {
  const snapshot = {} as Record<PressureAxisId, number>;
  for (const id of Object.keys(axes) as PressureAxisId[]) {
    snapshot[id] = axes[id].value;
  }
  return snapshot;
}

export type NarrativeIntensity = 'low' | 'medium' | 'high' | 'extreme';

export function getNarrativeIntensity(
  axes: Record<PressureAxisId, PressureAxis>,
): { level: NarrativeIntensity; constraint: string } {
  const values = Object.values(axes).map((a) => a.value);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  if (avg >= 75) return {
    level: 'extreme',
    constraint: '叙事烈度：极高。允许武装冲突、兵变、生死摊牌。',
  };
  if (avg >= 55) return {
    level: 'high',
    constraint: '叙事烈度：高。允许暗杀阴谋、逼宫、阵营分裂、直接对抗，但不允许全面武装冲突。',
  };
  if (avg >= 30) return {
    level: 'medium',
    constraint: '叙事烈度：中。允许公开争论、弹劾、政治拉拢、小规模冲突，但不允许暗杀或武装对抗。',
  };
  return {
    level: 'low',
    constraint: '叙事烈度：低。只允许暗流涌动、试探、情报收集、日常政务，禁止任何公开冲突或武力对抗。',
  };
}

// ===== 事件触发检查 =====

function checkPrecondition(precondition: EventPrecondition, state: WorldState): boolean {
  const p = precondition.params;

  switch (precondition.type) {
    case 'pressure_above': {
      const axis = state.pressureAxes[p.axisId as PressureAxisId];
      return axis ? axis.value >= (p.value as number) : false;
    }
    case 'pressure_below': {
      const axis = state.pressureAxes[p.axisId as PressureAxisId];
      return axis ? axis.value < (p.value as number) : false;
    }
    case 'day_range':
      return state.calendar.daysSinceStart >= (p.minDay as number)
        && state.calendar.daysSinceStart <= (p.maxDay as number);
    case 'flag':
      return state.globalFlags[p.key as string] === (p.value ?? true);
    case 'event_completed':
      return state.eventLog.some((e) => e.skeletonId === p.eventId || e.instanceId === p.eventId);
    case 'event_not_completed':
      return !state.eventLog.some((e) => e.skeletonId === p.eventId || e.instanceId === p.eventId);
    case 'npc_patience_below': {
      const agent = state.npcAgents[p.characterId as string];
      return agent ? agent.patience < (p.value as number) : false;
    }
    case 'relationship_above':
    case 'relationship_below':
      // 需要 Character 数据，在 WorldSimulator 层处理
      return true;
    default:
      return false;
  }
}

function checkPressureTrigger(
  trigger: PressureTrigger,
  axes: Record<PressureAxisId, PressureAxis>,
): boolean {
  // 每条轴必须各自超过阈值
  const allAxesMet = trigger.axes.every((t) => {
    const axis = axes[t.axisId];
    return axis ? axis.value >= t.threshold : false;
  });

  if (!allAxesMet) return false;

  // 如果有 combinedThreshold，还要检查加权和
  if (trigger.combinedThreshold !== undefined) {
    const weightedSum = trigger.axes.reduce((sum, t) => {
      const axis = axes[t.axisId];
      return sum + (axis ? axis.value * t.weight : 0);
    }, 0);
    return weightedSum >= trigger.combinedThreshold;
  }

  return true;
}

/**
 * 检查所有骨架模板，返回满足触发条件的事件列表（按 priority 降序）
 */
export function checkEventTriggers(
  state: WorldState,
  skeletons: EventSkeleton[],
): PendingEvent[] {
  const eligible: EventSkeleton[] = [];

  for (const skeleton of skeletons) {
    // 检查出现次数
    const occurrences = state.eventLog.filter((e) => e.skeletonId === skeleton.id).length;
    if (occurrences >= skeleton.maxOccurrences) continue;

    // 检查冷却
    const lastOccurrence = state.eventLog
      .filter((e) => e.skeletonId === skeleton.id)
      .sort((a, b) => b.day - a.day)[0];
    if (lastOccurrence && state.calendar.daysSinceStart - lastOccurrence.day < skeleton.cooldownDays) {
      continue;
    }

    // 检查是否已在 pending 中
    if (state.pendingEvents.some((pe) => pe.skeletonId === skeleton.id)) continue;

    // 检查前置条件（全部满足）
    const allPreconditionsMet = skeleton.preconditions.every((pc) => checkPrecondition(pc, state));
    if (!allPreconditionsMet) continue;

    // 检查压力触发器（至少一条满足）
    const anyTriggerMet = skeleton.pressureTriggers.some((t) =>
      checkPressureTrigger(t, state.pressureAxes),
    );
    if (!anyTriggerMet) continue;

    eligible.push(skeleton);
  }

  // 按 priority 降序，取前 1 个（防止事件洪泛）
  eligible.sort((a, b) => b.priority - a.priority);

  return eligible.slice(0, 1).map((s) => ({
    skeletonId: s.id,
    triggeredOnDay: state.calendar.daysSinceStart,
    pressureSnapshot: snapshotPressure(state.pressureAxes),
  }));
}
