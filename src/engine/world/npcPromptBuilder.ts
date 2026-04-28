import type { NpcAgentState, NpcStance, WorldState, ResolutionSignal } from '../../types/world';
import type { CharacterCore } from '../../types';
import { PRESSURE_AXIS_LABELS, getPressureLabel, getEffectiveTrust } from './worldState';
import { formatDate } from './calendar';
import { getNarrativeIntensity } from './pressure';
import { buildConstraintBlock } from '../../data/promptConstraints';
import { selectMemories } from './memoryExtractor';
import type { PressureAxisId } from '../../types/world';

const STANCE_GUIDE: Record<NpcStance, { name: string; examples: string }> = {
  observe:     { name: '观望',       examples: '听朝议、盯局势、按兵不动' },
  plant_spy:   { name: '安插探子',   examples: '安排心腹混入东宫、收买宫中内侍、渗透皇宫' },
  counterspy:  { name: '反间搜敌',   examples: '排查府中可疑人等、清除敌方眼线、审讯叛徒' },
  analyze:     { name: '情报研判',   examples: '解读截获密报、研判敌方动向、紧急转移人员' },
  advise:      { name: '温和进言',   examples: '夜谈献策、上书建议、私下劝导' },
  remonstrate: { name: '强硬劝谏',   examples: '跪谏秦王、以死相争、直言不讳' },
  lobby:       { name: '游说拉拢',   examples: '联络中立朝臣、争取外部支持、宴请要员' },
  scheme:      { name: '对内串联',   examples: '暗中拉拢府中将领、密约立誓、统一内部' },
  coordinate:  { name: '对外联络',   examples: '联络府外盟友、与外镇将领通信、传递密函' },
  strategize:  { name: '谋划方略',   examples: '密议大计、拟定兵变方略、布局伏笔' },
  drill:       { name: '练兵备战',   examples: '点检甲仗、操练兵马、磨砺刀兵' },
  rally:       { name: '动员激励',   examples: '召集心腹、鼓舞士气、激励将士' },
  patrol:      { name: '巡逻戒备',   examples: '巡视府卫、加强警戒、布置暗哨' },
  pressure:    { name: '当面施压',   examples: '闯东宫质问、威慑敌方、公开对峙' },
  defy:        { name: '越级抗命',   examples: '擅自调兵、违令行事、先斩后奏' },
  assassinate: { name: '安排暗杀',   examples: '刺杀敌方幕僚、除掉关键人物、暗中下手' },
  capture:     { name: '安排抓人',   examples: '秘密拘押敌方密探、扣留使者、绑架要员' },
  breakdown:   { name: '失控破局',   examples: '越级调兵、逼宫秦王（一生一次）' },
  abandon:     { name: '出走决裂',   examples: '挂冠、投敌、私通东宫（一生一次）' },
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
    character?: CharacterCore;
  } = {},
): string {
  const lines: string[] = [];

  lines.push(`你是${characterName}，秦王李世民的核心幕僚。`);

  if (options.character) {
    const c = options.character;
    const traits = c.identity.personality.traitKeywords.join('、');
    lines.push(`性格：${c.identity.oneLiner}特质：${traits}。`);
    if (c.goals.shortTerm.length > 0) {
      lines.push(`当前目标：${c.goals.shortTerm.join('；')}。`);
    }
    lines.push(`内心：${c.goals.internalConflict}`);
  }

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
  lines.push(`你的状态：耐心 ${Math.round(agentState.patience)}/100，警觉 ${Math.round(agentState.alertness)}/100，承诺 ${Math.round(agentState.commitment)}/100`);
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
  const memories = selectMemories(worldState.characterMemories?.[characterId], { topK: 5, recentGuaranteed: 1 });
  const longTermSummary = worldState.characterLongTermSummary?.[characterId];
  if (longTermSummary) {
    lines.push('你的长期记忆（提炼）：');
    lines.push(`  ${longTermSummary}`);
    lines.push('');
  }
  if (memories.length > 0) {
    lines.push('你的近期记忆：');
    for (const mem of memories) {
      lines.push(`  [${mem.emotionalTag}] ${mem.event}`);
    }
    lines.push('');
  }

  // 你当前对关键人物的态度（静态 trust + 运行时 delta）
  if (options.character) {
    const relIds = Object.keys(options.character.relationships);
    const attitudeLines: string[] = [];
    for (const relId of relIds) {
      const rel = options.character.relationships[relId];
      const eff = getEffectiveTrust(worldState, characterId, relId, rel.trust);
      if (eff.delta === 0 && eff.recentEvents.length === 0) continue;   // 没变化的不浪费 token
      const deltaStr = eff.delta > 0 ? `+${eff.delta}` : `${eff.delta}`;
      const recent = eff.recentEvents.length > 0
        ? `（${eff.recentEvents.slice(-2).join('；')}）`
        : '';
      attitudeLines.push(`  对${rel.role}：信任${eff.value}/100（较初始${deltaStr}）${recent}`);
    }
    if (attitudeLines.length > 0) {
      lines.push('你当前的态度变化：');
      lines.push(...attitudeLines);
      lines.push('');
    }
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

  // 秦王近期行为（日常活动 + 事件结局）——给 NPC 直接可见的"殿下在做什么"
  const recentActions = (worldState.playerActionLog ?? [])
    .filter((a) => a.day >= worldState.calendar.daysSinceStart - 5)
    .slice(-6);
  if (recentActions.length > 0) {
    lines.push('秦王近日行踪：');
    for (const a of recentActions) {
      const tag = a.type === 'activity' ? '' : a.type === 'event_skipped' ? '[未处置]' : '[事件]';
      lines.push(`  [${a.date}] ${tag}${a.name}${a.summary ? `：${a.summary}` : ''}`);
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
  resolution: { coreConflict: string; resolutionSignals: ResolutionSignal[] },
  worldState: WorldState,
  availableNpcIds: string[],
  lockedNpcIds: string[] = [],
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
  if (lockedNpcIds.length > 0) {
    lines.push(`已锁定NPC（必须出现在 activeNpcIds 中）：${lockedNpcIds.join('、')}`);
  }
  lines.push('');

  // 阶段骨架
  lines.push('阶段骨架：');
  for (const phase of phaseSkeletons) {
    lines.push(`  ${phase.role}（${phase.turnRange[0]}-${phase.turnRange[1]}回合）：${phase.description}`);
  }
  lines.push('');

  // 收束
  lines.push(`核心悬念：${resolution.coreConflict}`);
  lines.push('可能的收束方向（按 outcome 标签分组）：');
  const grouped: Record<string, string[]> = { success: [], partial: [], failure: [], disaster: [] };
  for (const sig of resolution.resolutionSignals) {
    grouped[sig.outcome]?.push(sig.description);
  }
  if (grouped.success.length) lines.push(`  success（成功）：${grouped.success.join('；')}`);
  if (grouped.partial.length) lines.push(`  partial（折中）：${grouped.partial.join('；')}`);
  if (grouped.failure.length) lines.push(`  failure（失败）：${grouped.failure.join('；')}`);
  if (grouped.disaster.length) lines.push(`  disaster（灾难）：${grouped.disaster.join('；')}`);
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
