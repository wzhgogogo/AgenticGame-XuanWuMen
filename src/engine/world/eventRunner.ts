import type { EventInstance } from '../../types/world';
import type { SceneConfig } from '../../types';
import { formatDate } from './calendar';
import { getNarrativeIntensity } from './pressure';
import { buildConstraintBlock } from '../../data/promptConstraints';
import type { CalendarState, PressureAxisId, PressureAxis } from '../../types/world';

/**
 * 将 EventInstance 转换为 SceneConfig，使其可以被现有 SceneManager 消费。
 * 这是新事件系统和旧场景引擎之间的适配器。
 */
export function eventInstanceToSceneConfig(
  instance: EventInstance,
  calendar: CalendarState,
  pressureAxes?: Record<PressureAxisId, PressureAxis>,
): SceneConfig {
  const { constraint } = pressureAxes
    ? getNarrativeIntensity(pressureAxes)
    : { constraint: '' };
  const dateStr = formatDate(calendar);
  return {
    id: `event_${instance.skeletonId}_${Date.now()}`,
    time: dateStr,
    location: instance.location,
    narratorIntro: instance.narratorIntro,
    activeNpcIds: instance.activeNpcIds,
    phases: instance.phases,
    endingTrigger: {
      minTurns: instance.resolution.softCap,
      maxTurns: instance.resolution.hardCap,
    },
    narrativeConstraint: constraint
      ? buildConstraintBlock(dateStr, constraint, true)
      : undefined,
  };
}

/**
 * 为事件场景的 system prompt 构建收束指令
 * 替代原来的硬性轮次触发
 */
export function buildResolutionPromptSection(instance: EventInstance): string {
  const lines: string[] = [];

  lines.push('===== 场景收束机制 =====');
  lines.push(`本场景核心悬念：${instance.resolution.coreConflict}`);
  lines.push('');
  lines.push('可能的收束方向（按 outcome 标签分组）：');

  const grouped: Record<string, string[]> = { success: [], partial: [], failure: [], disaster: [] };
  for (const signal of instance.resolution.resolutionSignals) {
    grouped[signal.outcome]?.push(signal.description);
  }
  if (grouped.success.length) lines.push(`  success（成功）：${grouped.success.join('；')}`);
  if (grouped.partial.length) lines.push(`  partial（折中）：${grouped.partial.join('；')}`);
  if (grouped.failure.length) lines.push(`  failure（失败）：${grouped.failure.join('；')}`);
  if (grouped.disaster.length) lines.push(`  disaster（灾难）：${grouped.disaster.join('；')}`);

  lines.push('');
  lines.push('当悬念已被回答（无论以何种方式），在 JSON 中加入：');
  lines.push('  - "ending"：200-400 字结局描述');
  lines.push('  - "chosenOutcome"：从 success / partial / failure / disaster 中选一个，标识本次收束属于哪类');
  lines.push('  - suggestedActions 设为空数组');
  lines.push('');
  lines.push('chosenOutcome 决定了哪些资产变化（夺官/失盟/伤将等）会被应用——请如实选择，不要默认 success。');
  lines.push('不要急于结束——允许冲突在场景内自然发展。如果玩家的行动引发了新的冲突分支，继续推进直到新冲突也有了结果。');

  return lines.join('\n');
}

/**
 * 构建 soft cap 提示（当轮次超过 softCap 时追加的 system message）
 */
export function buildSoftCapMessage(instance: EventInstance): string {
  return `场景已经持续较久。核心悬念"${instance.resolution.coreConflict}"应该在接下来2-3轮内得到回答。请引导叙事走向收束，但保持自然——不要生硬结束。`;
}
