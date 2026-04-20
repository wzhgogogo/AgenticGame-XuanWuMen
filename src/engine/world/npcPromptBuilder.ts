import type { NpcAgentState, NpcStance, WorldState } from '../../types/world';
import { PRESSURE_AXIS_LABELS, getPressureLabel } from './worldState';
import { formatDate } from './calendar';
import { getNarrativeIntensity } from './pressure';
import { buildConstraintBlock } from '../../data/promptConstraints';
import type { PressureAxisId } from '../../types/world';

const STANCE_GUIDE: Record<NpcStance, { name: string; examples: string }> = {
  observe:   { name: '观望',     examples: '听朝议、盯局势、按兵不动' },
  intel:     { name: '情报',     examples: '探亲信、布暗桩、截密报' },
  persuade:  { name: '温和施压', examples: '上书、夜谈、劝谏' },
  scheme:    { name: '暗中谋划', examples: '串联、立誓、埋伏笔' },
  confront:  { name: '当面对抗', examples: '闯府、质问、要求决断' },
  mobilize:  { name: '动员武力', examples: '练兵、点将、藏甲' },
  breakdown: { name: '失控破局', examples: '越级调兵、逼宫秦王（一生一次）' },
  abandon:   { name: '出走决裂', examples: '挂冠、投敌、私通东宫（一生一次）' },
};

/**
 * 为 NPC agent 决策构建 LLM prompt
 */
export function buildNpcDecisionPrompt(
  characterId: string,
  characterName: string,
  agentState: NpcAgentState,
  allowedStances: NpcStance[],
  worldState: WorldState,
  options: {
    escalationHints?: string[];
    impactWhitelist?: PressureAxisId[];
  } = {},
): string {
  const lines: string[] = [];

  lines.push(`你是${characterName}，秦王李世民的核心幕僚。`);
  const { constraint } = getNarrativeIntensity(worldState.pressureAxes);
  lines.push(buildConstraintBlock(formatDate(worldState.calendar), constraint));
  lines.push('');

  // 压缩世界状态
  lines.push('当前形势：');
  for (const axisId of Object.keys(worldState.pressureAxes) as PressureAxisId[]) {
    const axis = worldState.pressureAxes[axisId];
    const label = PRESSURE_AXIS_LABELS[axisId];
    const level = getPressureLabel(axis.value);
    lines.push(`  ${label}(${axisId})：${level}（${Math.round(axis.value)}）`);
  }
  lines.push('');

  // NPC 自身状态
  lines.push(`你的状态：耐心 ${Math.round(agentState.patience)}/100，承诺 ${Math.round(agentState.commitment)}/100`);
  if (agentState.currentPlan) {
    lines.push(`当前计划：${agentState.currentPlan}`);
  }
  lines.push(`距离上次行动已过 ${agentState.daysSinceLastAction} 天`);
  lines.push('');

  // 软约束：最近 3 天的行动
  const recent = agentState.recentActions.slice(-3);
  if (recent.length > 0) {
    const stanceHistory = recent.map((a) => a.stance).join(' → ');
    lines.push(`你最近的立场序列：${stanceHistory}（可延续，也可推进，由你判断）`);
    lines.push('');
  }

  // 角色近期记忆
  const memories = worldState.characterMemories?.[characterId];
  if (memories && memories.length > 0) {
    lines.push('你的近期记忆：');
    for (const mem of memories.slice(-5)) {
      lines.push(`  [${mem.emotionalTag}] ${mem.event}`);
    }
    lines.push('');
  }

  // 最近事件
  if (worldState.eventLog.length > 0) {
    const recentEvents = worldState.eventLog.slice(-2);
    lines.push('近期发生：');
    for (const evt of recentEvents) {
      lines.push(`  ${evt.name}：${evt.summary}`);
    }
    lines.push('');
  }

  // 升级提示
  if (options.escalationHints && options.escalationHints.length > 0) {
    lines.push('当前情绪提示：');
    for (const hint of options.escalationHints) {
      lines.push(`  · ${hint}`);
    }
    lines.push('');
  }

  // 立场大类
  lines.push('你今日可选的行动立场（stance）：');
  for (const stance of allowedStances) {
    const g = STANCE_GUIDE[stance];
    lines.push(`  - ${stance}（${g.name}）：${g.examples}`);
  }
  lines.push('');

  // 白名单提示
  if (options.impactWhitelist && options.impactWhitelist.length > 0) {
    const ids = options.impactWhitelist.join(', ');
    lines.push(`你的行动只能影响以下压力轴（axisId 用英文 id）：${ids}`);
    lines.push('');
  }

  // 输出规范
  lines.push('请从允许的 stance 中选一个，自由命名你今日具体想做的事（8-16 字），');
  lines.push('并提议该行动对压力轴的影响（每条 delta 范围 -3 到 +3，最多 3 条；若为 breakdown/abandon，单条可到 ±8 / ±6）。');
  lines.push('');
  lines.push('【description 字段写作规范（日报显示，必须遵守）】');
  lines.push(`  · 视角：第三人称外部叙述，主语是"${characterName}"，不要用"我"。`);
  lines.push('  · 时态：描述当日正在发生的行为（如"xx与xx密议"），不要总结未来或过去。');
  lines.push('  · 风格：平实史书体，一句话交代谁、做了什么、在哪。不要文学化比喻（如"火种""战栗""阴影"）。');
  lines.push('  · 禁忌：不得提及尚未发生的事件（玄武门之变、即位、登基、贞观、太宗等）；不得写具体对话；不得超过 30 字。');
  lines.push('  · 范例：「长孙无忌夜访房玄龄，商议应对东宫之策」「尉迟敬德于府中点检甲仗，调遣心腹」');
  lines.push('');
  lines.push('输出 JSON：');
  lines.push('{');
  lines.push('  "stance": "立场 key（如 persuade）",');
  lines.push('  "action": "你自由命名的具体动作（如\'夜访萧瑀议储位\'）",');
  lines.push('  "target": "可选：目标人物/地点",');
  lines.push('  "description": "一句话描述（≤30 字，第三人称史书体，用于日报）",');
  lines.push('  "pressureDeltas": [');
  lines.push('    {"axisId": "succession_crisis", "delta": 2, "reason": "原因"}');
  lines.push('  ]');
  lines.push('}');

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
  const { constraint: intensityConstraint } = getNarrativeIntensity(worldState.pressureAxes);
  lines.push(`【约束】${buildConstraintBlock(formatDate(worldState.calendar), intensityConstraint)}`);
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
