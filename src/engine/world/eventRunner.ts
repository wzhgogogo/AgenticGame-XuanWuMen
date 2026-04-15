import type { EventInstance } from '../../types/world';
import type { SceneConfig } from '../../types';
import { formatDate } from './calendar';
import type { CalendarState } from '../../types/world';

/**
 * 将 EventInstance 转换为 SceneConfig，使其可以被现有 SceneManager 消费。
 * 这是新事件系统和旧场景引擎之间的适配器。
 */
export function eventInstanceToSceneConfig(
  instance: EventInstance,
  calendar: CalendarState,
): SceneConfig {
  return {
    id: `event_${instance.skeletonId}_${Date.now()}`,
    time: formatDate(calendar),
    location: instance.location,
    narratorIntro: instance.narratorIntro,
    activeNpcIds: instance.activeNpcIds,
    phases: instance.phases,
    endingTrigger: {
      // 使用 resolution 的 softCap/hardCap 作为兜底
      minTurns: instance.resolution.softCap,
      maxTurns: instance.resolution.hardCap,
    },
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
  lines.push('当以下任一信号出现时，场景应该走向收束：');
  for (const signal of instance.resolution.resolutionSignals) {
    lines.push(`  - ${signal}`);
  }
  lines.push('');
  lines.push('当你判断悬念已被回答（无论以何种方式），在JSON中加入 "ending" 字段，撰写200-400字的结局描述。suggestedActions 设为空数组。');
  lines.push('');
  lines.push('不要急于结束——允许冲突在场景内自然发展。如果玩家的行动引发了新的冲突分支，继续推进直到新冲突也有了结果。');

  return lines.join('\n');
}

/**
 * 构建 soft cap 提示（当轮次超过 softCap 时追加的 system message）
 */
export function buildSoftCapMessage(instance: EventInstance): string {
  return `场景已经持续较久。核心悬念"${instance.resolution.coreConflict}"应该在接下来2-3轮内得到回答。请引导叙事走向收束，但保持自然——不要生硬结束。`;
}
