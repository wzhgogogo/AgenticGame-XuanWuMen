import type { WorldState, EndingType, OfficeId } from '../../types/world';

/**
 * 结局判定（v3.4.4 单一入口，取代 worldSimulator.checkGameOver）。
 *
 * 5 结局：
 *   E1 coup_success            — 武力发动成功 + 关键盟友 ≥2 active + 兵力 ≥60
 *   E3 coup_fail_civil_war_win — 武力胜利但代价沉重（≥1 名核心盟友非 active）
 *   F1 deposed                 — 多职被剥夺 / 关键盟友 ≥2 非 active，未走武力
 *   F5 coup_fail_captured      — 武力发动但兵力上限 < 50（强行硬上）
 *   N1 peace                   — 第 180 天兜底
 *
 * 即时判定：F5/E3/E1 在 militaryConflict 事件结算后立刻触发；F1 在多职丢失或盟友散尽时立刻触发。
 * 倒计时判定：第 180 天到（calendar.month > 6）按当时世界状态匹配。
 */

export interface EndingDecision {
  ending: EndingType;
  reason: string;
  evidence: {
    militaryCeiling: number;
    militaryValue: number;
    lostOffices: OfficeId[];
    nonActiveAllies: string[];
    keyFlags: string[];
    triggeredMilitary: boolean;
  };
}

/** 秦王府核心三人——E3/F1 判定的关键盟友 */
const CORE_ALLIES: readonly string[] = ['changsun_wuji', 'weichi_jingde', 'fang_xuanling'];

export function resolveEnding(state: WorldState): EndingDecision | null {
  const evidence = collectEvidence(state);

  // 1. F5/E3/E1 — 武力路径已触发（militaryConflict 事件结算后）
  if (evidence.triggeredMilitary) {
    if (evidence.militaryCeiling < 50) {
      return {
        ending: 'coup_fail_captured',
        reason: 'F5: 兵力上限不足 50，强行发动溃败',
        evidence,
      };
    }
    if (evidence.nonActiveAllies.length >= 1) {
      return {
        ending: 'coup_fail_civil_war_win',
        reason: 'E3: 武力胜利但 ≥1 名核心盟友已折损',
        evidence,
      };
    }
    if (evidence.militaryCeiling >= 60) {
      return {
        ending: 'coup_success',
        reason: 'E1: 兵力上限 ≥60 且核心盟友健在',
        evidence,
      };
    }
    return {
      ending: 'coup_fail_civil_war_win',
      reason: 'E3: 武力发动但兵力中等（50-60），按惨胜处理',
      evidence,
    };
  }

  // 2. F1 即时触发——多职丢失或盟友散尽（≥3 同时满足才即时触发，避免误判）
  const allyCollapsed = evidence.nonActiveAllies.length >= 2;
  const officesCollapsed = evidence.lostOffices.length >= 3;
  if (allyCollapsed && officesCollapsed) {
    return {
      ending: 'deposed',
      reason: 'F1 即时：盟友散尽 + 多职被剥夺',
      evidence,
    };
  }

  // 3. 第 180 天兜底（六月底）
  if (state.calendar.month > 6) {
    if (evidence.lostOffices.length >= 2 || evidence.nonActiveAllies.length >= 2) {
      return {
        ending: 'deposed',
        reason: 'F1 倒计时：六月已过，政治路径累积失败',
        evidence,
      };
    }
    return {
      ending: 'peace',
      reason: 'N1: 六月已过，未触发关键路径',
      evidence,
    };
  }

  return null;
}

function collectEvidence(state: WorldState): EndingDecision['evidence'] {
  const military = state.pressureAxes.military_readiness;
  const offices = state.playerOffices ?? [];

  const lostOffices: OfficeId[] = offices
    .filter((o) => o.lostDay !== undefined)
    .map((o) => o.id);

  const nonActiveAllies: string[] = [];
  for (const id of CORE_ALLIES) {
    const agent = state.npcAgents[id];
    if (agent && agent.status && agent.status !== 'active') {
      nonActiveAllies.push(id);
    }
  }

  const triggeredMilitary = state.eventLog.some(
    (e) => e.skeletonId === 'skeleton_military_conflict',
  );

  const keyFlags: string[] = [];
  for (const k of Object.keys(state.globalFlags ?? {})) {
    if (state.globalFlags[k]) keyFlags.push(k);
  }

  return {
    militaryCeiling: military?.ceiling ?? 0,
    militaryValue: military?.value ?? 0,
    lostOffices,
    nonActiveAllies,
    keyFlags,
    triggeredMilitary,
  };
}
