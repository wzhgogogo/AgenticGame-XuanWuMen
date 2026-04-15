import type { NpcAgentState, NpcActionType, WorldState } from '../../types/world';
import { PRESSURE_AXIS_LABELS, getPressureLabel } from './worldState';
import type { PressureAxisId } from '../../types/world';

/**
 * 为 NPC agent 决策构建紧凑的 LLM prompt（约 300 tokens）
 */
export function buildNpcDecisionPrompt(
  _characterId: string,
  characterName: string,
  agentState: NpcAgentState,
  enabledActions: NpcActionType[],
  worldState: WorldState,
): string {
  const lines: string[] = [];

  lines.push(`你是${characterName}，秦王李世民的核心幕僚。`);
  lines.push('');

  // 压缩世界状态
  lines.push('当前形势：');
  for (const axisId of Object.keys(worldState.pressureAxes) as PressureAxisId[]) {
    const axis = worldState.pressureAxes[axisId];
    const label = PRESSURE_AXIS_LABELS[axisId];
    const level = getPressureLabel(axis.value);
    lines.push(`  ${label}：${level}（${Math.round(axis.value)}）`);
  }
  lines.push('');

  // NPC 自身状态
  lines.push(`你的状态：耐心 ${Math.round(agentState.patience)}/100，承诺 ${Math.round(agentState.commitment)}/100`);
  if (agentState.currentPlan) {
    lines.push(`当前计划：${agentState.currentPlan}`);
  }
  lines.push(`距离上次行动已过 ${agentState.daysSinceLastAction} 天`);
  lines.push('');

  // 最近事件
  if (worldState.eventLog.length > 0) {
    const recent = worldState.eventLog.slice(-2);
    lines.push('近期发生：');
    for (const evt of recent) {
      lines.push(`  ${evt.name}：${evt.summary}`);
    }
    lines.push('');
  }

  // 可选行动
  const actionLabels: Record<NpcActionType, string> = {
    lobby: '游说拉拢朝中人物',
    confront: '当面向秦王进言/逼迫',
    scheme: '暗中谋划部署',
    gather_intel: '收集情报',
    wait: '按兵不动',
    pressure_player: '向秦王施压催促决断',
    seek_allies: '联络外部盟友',
    sabotage: '破坏敌方计划',
  };

  lines.push('你今日可选行动：');
  for (const action of enabledActions) {
    lines.push(`  - ${action}：${actionLabels[action]}`);
  }
  lines.push('');

  lines.push('选择一个行动，简要说明理由（50字内）。');
  lines.push('输出JSON：{"action": "行动类型", "reason": "理由", "narrativeHook": "一句话描述（用于日报）"}');

  return lines.join('\n');
}

/**
 * 为事件变体生成构建 LLM prompt
 */
export function buildEventGenerationPrompt(
  skeletonCategory: string,
  skeletonDescription: string,
  constraints: string[],
  possibleLocations: string[],
  requiredRoles: string[],
  phaseSkeletons: Array<{ role: string; description: string; turnRange: [number, number] }>,
  resolution: { coreConflict: string; resolutionSignals: string[] },
  worldState: WorldState,
  availableNpcIds: string[],
): string {
  const lines: string[] = [];

  lines.push(`你是一个历史事件编剧。根据当前武德九年的局势，生成一个"${skeletonCategory}"类型的事件。`);
  lines.push('');

  // 当前形势
  lines.push('当前形势：');
  for (const axisId of Object.keys(worldState.pressureAxes) as PressureAxisId[]) {
    const axis = worldState.pressureAxes[axisId];
    const label = PRESSURE_AXIS_LABELS[axisId];
    const level = getPressureLabel(axis.value);
    lines.push(`  ${label}：${Math.round(axis.value)}/100（${level}）`);
  }
  lines.push('');

  // 近期事件
  if (worldState.eventLog.length > 0) {
    lines.push('近期已发生的事件：');
    const recent = worldState.eventLog.slice(-3);
    for (const evt of recent) {
      lines.push(`  [第${evt.day}天] ${evt.name}：${evt.summary}`);
    }
    lines.push('');
  }

  // 事件类型说明
  lines.push(`事件类型说明：${skeletonDescription}`);
  lines.push('');

  // 约束
  lines.push('约束条件：');
  for (const c of constraints) {
    lines.push(`  - ${c}`);
  }
  lines.push('');

  // 可选地点和角色
  lines.push(`可选地点：${possibleLocations.join('、')}`);
  lines.push(`必须角色：${requiredRoles.join('、')}`);
  lines.push(`可用NPC ID：${availableNpcIds.join('、')}`);
  lines.push('');

  // 阶段骨架
  lines.push('阶段骨架：');
  for (const phase of phaseSkeletons) {
    lines.push(`  ${phase.role}（${phase.turnRange[0]}-${phase.turnRange[1]}回合）：${phase.description}`);
  }
  lines.push('');

  // 收束
  lines.push(`核心悬念：${resolution.coreConflict}`);
  lines.push('收束信号：' + resolution.resolutionSignals.join('；'));
  lines.push('');

  lines.push('请输出JSON格式：');
  lines.push('{');
  lines.push('  "name": "事件名称（4-8字）",');
  lines.push('  "location": "地点",');
  lines.push('  "activeNpcIds": ["参与NPC的id"],');
  lines.push('  "narratorIntro": "开场旁白（100-200字，营造紧张氛围）",');
  lines.push('  "phases": [');
  lines.push('    {"id": "phase_1", "name": "阶段名", "turnRange": [1, 3], "suggestedActions": ["建议1", "建议2", "建议3"]}');
  lines.push('  ]');
  lines.push('}');

  return lines.join('\n');
}
