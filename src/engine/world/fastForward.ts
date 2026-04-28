import type { WorldState } from '../../types/world';

export interface FastForwardPlan {
  canForward: boolean;
  maxSafeDays: number;
  stopReasons: string[];
}

const TOTAL_GAME_DAYS = 180;

/**
 * 纯只读判定：当前状态下能否安全快进 N 天，以及实际能跑多少天。
 *
 * 判定按代价从低到高：
 *   1) pendingEvents 非空 → 0
 *   2) 第 180 天兜底
 *   3) 后续动态信号（NPC patience / 压力轴外推）由 worldSimulator.fastForward 在每日循环中重 plan
 *
 * 注：不在这里做 NPC patience / 压力外推预测——velocity 在每日 NPC 决策后会变，
 *     一次性预测不可信，改为 fastForward 内每天重新 plan。
 */
export function planFastForward(state: WorldState, requestedDays: number): FastForwardPlan {
  const stopReasons: string[] = [];

  if (state.pendingEvents.length > 0) {
    return {
      canForward: false,
      maxSafeDays: 0,
      stopReasons: ['当前已有待处理事件'],
    };
  }

  const daysLeft = TOTAL_GAME_DAYS - state.calendar.daysSinceStart;
  if (daysLeft <= 0) {
    return {
      canForward: false,
      maxSafeDays: 0,
      stopReasons: ['已到游戏终局'],
    };
  }

  const maxSafeDays = Math.max(0, Math.min(requestedDays, daysLeft));

  if (maxSafeDays < requestedDays) {
    stopReasons.push(`距游戏终局仅剩 ${daysLeft} 天`);
  }

  return {
    canForward: maxSafeDays > 0,
    maxSafeDays,
    stopReasons,
  };
}
