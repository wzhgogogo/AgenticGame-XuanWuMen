/**
 * 试玩日志评估脚本
 * 用法:
 *   npx tsx scripts/eval-playthrough.ts scripts/autoplay-log.json
 */
import * as fs from 'fs';
import * as path from 'path';

// ===== 类型 =====
interface LogEntry {
  day: number;
  dateStr: string;
  phase: string;
  detail: Record<string, unknown>;
}

interface NpcActionEntry {
  who: string;
  stance: string;
  action: string;
  desc: string;
  deltas?: string[];
  degrade?: number;
}

interface TickDetail {
  pressureChanges: number;
  npcActions: NpcActionEntry[];
  triggeredEvents: Array<{ skeletonId: string; name?: string }>;
  briefing: string;
}

interface PressureSnapshot {
  axes: Record<string, number>;
}

interface QuantMetrics {
  totalDays: number;
  eventCount: number;
  eventDays: number[];
  avgEventInterval: number | null;
  eventIntervalStdDev: number | null;
  npcDecisions: Record<string, Record<string, number>>;
  activityChoices: Record<string, number>;
  pressureStart: Record<string, number>;
  pressureEnd: Record<string, number>;
  pressureDelta: Record<string, number>;
  totalNpcActions: number;
  totalDegraded: number;
  totalLlmImpliedCalls: number;
}

interface PromptRecord {
  ts: number;
  messages: Array<{ role: string; content: string }>;
  response: string;
}

interface RuleIssue {
  type: 'historical_leak' | 'naming_violation' | 'response_repetition' | 'memory_not_used' | 'fabricated_event' | 'persona_violation';
  detail: string;
  recordIndex?: number;
}

interface EmergenceMetrics {
  npcStanceDiversity: Record<string, {
    distribution: Record<string, number>;
    shannonEntropy: number;
    dominantStance: string;
    dominantRatio: number;
  }>;
  npcActionRepetitionRate: Record<string, number>;
  npcSilentDays: Record<string, number>;
  npcStanceTransitions: Record<string, number>;
  eventBehaviorShift: Array<{
    eventDay: number;
    skeletonId: string;
    shifts: Record<string, { before: string[]; after: string[] }>;
  }>;
}

interface MemoryAnalysis {
  totalMemoriesAdded: number;
  duplicateRate: number;
  emotionalTagDiversity: number;
  growthCurve: number[];
}

interface EvalResult {
  inputFile: string;
  timestamp: string;
  metrics: QuantMetrics;
  emergenceMetrics?: EmergenceMetrics;
  ruleBasedIssues?: RuleIssue[];
  memoryAnalysis?: MemoryAnalysis;
}

// ===== Part 1: 量化指标 =====

function computeMetrics(entries: LogEntry[]): QuantMetrics {
  const ticks = entries.filter(e => e.phase === 'tick').map(e => ({ day: e.day, detail: e.detail as unknown as TickDetail }));
  const snapshots = entries.filter(e => e.phase === 'pressure_snapshot').map(e => ({ day: e.day, detail: e.detail as unknown as PressureSnapshot }));
  const activities = entries.filter(e => e.phase === 'activity');

  const totalDays = entries.length > 0 ? Math.max(...entries.map(e => e.day)) + 1 : 0;

  // 事件触发
  const eventDays: number[] = [];
  for (const t of ticks) {
    if (t.detail.triggeredEvents && t.detail.triggeredEvents.length > 0) {
      eventDays.push(t.day);
    }
  }

  let avgEventInterval: number | null = null;
  let eventIntervalStdDev: number | null = null;
  if (eventDays.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < eventDays.length; i++) {
      intervals.push(eventDays[i] - eventDays[i - 1]);
    }
    avgEventInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, v) => sum + (v - avgEventInterval!) ** 2, 0) / intervals.length;
    eventIntervalStdDev = Math.sqrt(variance);
  }

  // NPC 决策分布（按 stance 聚合）
  const npcDecisions: Record<string, Record<string, number>> = {};
  let totalNpcActions = 0;
  let totalDegraded = 0;
  for (const t of ticks) {
    for (const a of t.detail.npcActions || []) {
      if (!npcDecisions[a.who]) npcDecisions[a.who] = {};
      const key = a.stance || a.action || 'unknown';
      npcDecisions[a.who][key] = (npcDecisions[a.who][key] || 0) + 1;
      totalNpcActions++;
      if (a.degrade && a.degrade > 0) totalDegraded++;
    }
  }

  // 活动选择分布
  const activityChoices: Record<string, number> = {};
  for (const a of activities) {
    const detail = a.detail as { id: string; name: string };
    const key = `${detail.id}(${detail.name})`;
    activityChoices[key] = (activityChoices[key] || 0) + 1;
  }

  // 压力轴起止
  const pressureStart = snapshots.length > 0 ? { ...snapshots[0].detail.axes } : {};
  const pressureEnd = snapshots.length > 0 ? { ...snapshots[snapshots.length - 1].detail.axes } : {};
  const pressureDelta: Record<string, number> = {};
  for (const key of Object.keys(pressureEnd)) {
    pressureDelta[key] = Math.round((pressureEnd[key] - (pressureStart[key] || 0)) * 10) / 10;
  }

  // LLM 调用估算（每个 tick 有 NPC 决策就至少 1 次 LLM 调用）
  const totalLlmImpliedCalls = ticks.filter(t => t.detail.npcActions && t.detail.npcActions.length > 0).length;

  return {
    totalDays,
    eventCount: eventDays.length,
    eventDays,
    avgEventInterval,
    eventIntervalStdDev,
    npcDecisions,
    activityChoices,
    pressureStart,
    pressureEnd,
    pressureDelta,
    totalNpcActions,
    totalDegraded,
    totalLlmImpliedCalls,
  };
}

function printMetrics(m: QuantMetrics): void {
  console.log('\n===== 量化指标 =====\n');

  console.log(`游戏天数: ${m.totalDays}`);
  console.log(`事件触发: ${m.eventCount} 次`);
  if (m.eventCount > 0) {
    console.log(`  触发日: ${m.eventDays.join(', ')}`);
  }
  if (m.avgEventInterval !== null) {
    console.log(`  平均间隔: ${m.avgEventInterval.toFixed(1)} 天 (σ=${m.eventIntervalStdDev!.toFixed(1)})`);
  }

  console.log(`\nNPC 决策总数: ${m.totalNpcActions}（降级 ${m.totalDegraded} 次）`);
  for (const [npc, actions] of Object.entries(m.npcDecisions)) {
    const parts = Object.entries(actions).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a}×${n}`);
    console.log(`  ${npc}: ${parts.join(', ')}`);
  }

  console.log('\n活动选择分布:');
  for (const [act, n] of Object.entries(m.activityChoices).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${act}: ${n}次`);
  }

  console.log('\n压力轴变化 (起始→终值, Δ):');
  const LABELS: Record<string, string> = {
    succession_crisis: '储位危机',
    jiancheng_hostility: '建成敌意',
    yuanji_ambition: '元吉冒进',
    court_opinion: '朝堂舆论',
    qinwangfu_desperation: '秦王府急迫',
    imperial_suspicion: '李渊猜疑',
    military_readiness: '军事准备',
  };
  for (const [key, delta] of Object.entries(m.pressureDelta)) {
    const label = LABELS[key] || key;
    const start = m.pressureStart[key] ?? '?';
    const end = m.pressureEnd[key] ?? '?';
    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    console.log(`  ${label}: ${start}→${end} (${arrow}${delta > 0 ? '+' : ''}${delta})`);
  }

  console.log(`\nLLM 调用估算: ~${m.totalLlmImpliedCalls} 次 tick 含 NPC 决策`);
}

// ===== Part 2: Rule-based 自动检测 =====

const BANNED_WORDS = [
  '玄武门之变', '血洗玄武门', '李承乾', '太宗', '贞观', '天可汗',
  '即位', '登基', '入继大统', '弑兄', '弑父', '政变成功',
  '继位', '登极', '新君', '践祚', '大业已成', '功成名就',
  '天策上将府', '凌烟阁', '贞观之治', '明君', '圣君',
  '杀兄', '杀弟', '鸩酒', '兵变成功', '夺位',
];

const NAMING_VIOLATIONS: Array<{ pattern: RegExp; detail: string }> = [
  // NPC 对李世民使用帝王称谓
  { pattern: /(?:长孙无忌|尉迟敬德|房玄龄|尉迟恭)[^。]{0,30}(?:陛下|圣上)/,
    detail: 'NPC 对李世民使用了帝王称谓（陛下/圣上）' },
  // NPC 使用李世民专属亲属称呼
  { pattern: /(?:长孙无忌|尉迟敬德|房玄龄|尉迟恭)[^。]{0,20}(?:父皇|大哥|四弟)/,
    detail: 'NPC 使用了李世民专属亲属称呼（父皇/大哥/四弟）' },
  // NPC 直呼李世民姓名
  { pattern: /(?:长孙无忌|尉迟敬德|房玄龄|尉迟恭)[^。]{0,20}(?:李世民|世民)/,
    detail: 'NPC 直呼李世民姓名，应称"殿下"或"秦王"' },
  // NPC 对太子/齐王使用亲属称呼
  { pattern: /(?:长孙|尉迟|房玄龄)[^。]{0,20}(?:建成兄|元吉弟|建成哥)/,
    detail: 'NPC 对太子/齐王使用了亲属称呼，应称"太子"/"齐王"' },
  // NPC 直呼李渊姓名
  { pattern: /(?:长孙|尉迟|房玄龄)[^。]{0,20}李渊/,
    detail: 'NPC 直呼李渊姓名，应称"陛下"或"圣上"' },
  // 穿越称谓——后世用法
  { pattern: /皇上|万岁爷|圣天子/,
    detail: '使用了不符合唐初时代的称谓（皇上/万岁爷/圣天子为后世用法）' },
];

// NPC 人设反关键词（粗筛）
const PERSONA_VIOLATIONS: Record<string, { antiKeywords: string[]; detail: string }> = {
  changsun_wuji: {
    antiKeywords: ['拔剑', '暴怒', '大骂'],
    detail: '长孙无忌（谨慎谋士）出现了暴烈行为描述',
  },
  weichi_jingde: {
    antiKeywords: ['隐忍', '迂回', '婉转', '试探', '缓缓'],
    detail: '尉迟敬德（暴烈武将）出现了过于谨慎的行为描述',
  },
  fang_xuanling: {
    antiKeywords: ['拔剑', '暴怒', '大骂'],
    detail: '房玄龄（稳健谋士）出现了暴烈行为描述',
  },
};

// 虚构事件引用模式
const FABRICATION_PATTERNS = [
  /昨[日天晚][^，。]{0,10}(?:刺杀|暗杀|行刺|伏击|兵变|政变|叛乱)/,
  /上次[^，。]{0,10}(?:宴会|宴席|朝会|密谋|冲突|交锋)/,
  /那[次日][^，。]{0,10}(?:刺杀|暗杀|兵变|政变|叛乱|伏击)/,
  /前[日天][^，。]{0,10}(?:刺杀|暗杀|行刺|伏击|兵变)/,
];

function readPromptRecords(inputFile: string): PromptRecord[] {
  const promptsFile = inputFile.replace(/\.json$/, '.prompts.jsonl');
  if (!fs.existsSync(promptsFile)) {
    console.log(`未找到 ${promptsFile}，跳过 prompt/response 检测`);
    return [];
  }
  const lines = fs.readFileSync(promptsFile, 'utf-8').split('\n').filter(Boolean);
  console.log(`读取 ${lines.length} 条 prompt 记录`);
  return lines.map(line => JSON.parse(line));
}

function stripThinking(text: string): string {
  return text.replace(/<thought>[\s\S]*?<\/thought>/g, '').replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
}

function ruleBasedChecks(records: PromptRecord[], entries: LogEntry[]): RuleIssue[] {
  const issues: RuleIssue[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = { ...records[i], response: stripThinking(records[i].response) };
    // 1. 禁用词检测
    for (const word of BANNED_WORDS) {
      if (r.response.includes(word)) {
        issues.push({ type: 'historical_leak', detail: `LLM 输出中出现禁用词"${word}"`, recordIndex: i });
      }
    }

    // 2. 称谓规则检测
    for (const rule of NAMING_VIOLATIONS) {
      if (rule.pattern.test(r.response)) {
        issues.push({ type: 'naming_violation', detail: rule.detail, recordIndex: i });
      }
    }

    // 3. 人设一致性检测（npc_decision 类型）
    const recType = classifyPromptRecord(records[i]);
    if (recType === 'npc_decision') {
      for (const [npcId, profile] of Object.entries(PERSONA_VIOLATIONS)) {
        const systemMsg = records[i].messages.find(m => m.role === 'system')?.content || '';
        if (!systemMsg.includes(npcId) && !systemMsg.includes(profile.detail.slice(0, 4))) continue;
        for (const kw of profile.antiKeywords) {
          if (r.response.includes(kw)) {
            issues.push({ type: 'persona_violation', detail: `${profile.detail}，关键词"${kw}"`, recordIndex: i });
          }
        }
      }
    }

    // 4. 虚构事件引用检测（scene_dialogue 类型）
    if (recType === 'scene_dialogue') {
      for (const pat of FABRICATION_PATTERNS) {
        const match = r.response.match(pat);
        if (match) {
          issues.push({
            type: 'fabricated_event',
            detail: `可能引用了未发生的事件："${match[0]}"（需人工确认）`,
            recordIndex: i,
          });
        }
      }
    }
  }

  // 3. response 重复检测（场景对话 + 事件生成 + 记忆提取，剥离 thinking 后比较）
  const narrativeRecords = records
    .map((r, idx) => ({ idx, stripped: stripThinking(r.response), type: classifyPromptRecord(r) }))
    .filter(r => r.type !== 'npc_decision');
  for (let i = 1; i < narrativeRecords.length; i++) {
    const a = narrativeRecords[i - 1];
    const b = narrativeRecords[i];
    if (a.type !== b.type) continue;
    if (a.stripped.length > 50 && b.stripped.length > 50) {
      const overlap = computeNgramOverlap(a.stripped, b.stripped, 5);
      if (overlap > 0.4) {
        issues.push({
          type: 'response_repetition',
          detail: `${a.type} 输出相似度过高 (${(overlap * 100).toFixed(0)}% 5-gram overlap)，records [${a.idx}] 和 [${b.idx}]`,
          recordIndex: b.idx,
        });
      }
    }
  }

  // 4. 记忆注入但未体现
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const systemMsg = r.messages.find(m => m.role === 'system');
    if (!systemMsg) continue;
    const memMatch = systemMsg.content.match(/近期记忆[：:]\s*([\s\S]*?)(?:\n\n|===|$)/);
    if (!memMatch) continue;
    const memText = memMatch[1].trim();
    if (memText.length < 10) continue;

    const memKeywords = memText.match(/[\u4e00-\u9fff]{2,6}/g) || [];
    const uniqueKeywords = [...new Set(memKeywords)].filter(k => k.length >= 3);
    if (uniqueKeywords.length === 0) continue;

    const stripped = stripThinking(r.response);
    const hits = uniqueKeywords.filter(k => stripped.includes(k)).length;
    if (hits === 0 && uniqueKeywords.length >= 3) {
      issues.push({
        type: 'memory_not_used',
        detail: `系统 prompt 注入了 ${uniqueKeywords.length} 个记忆关键词但 response 无一体现`,
        recordIndex: i,
      });
    }
  }

  return issues;
}

function computeNgramOverlap(a: string, b: string, n: number): number {
  const ngrams = (text: string) => {
    const set = new Set<string>();
    for (let i = 0; i <= text.length - n; i++) set.add(text.slice(i, i + n));
    return set;
  };
  const setA = ngrams(a);
  const setB = ngrams(b);
  let intersect = 0;
  for (const g of setA) { if (setB.has(g)) intersect++; }
  return intersect / Math.min(setA.size, setB.size);
}

function analyzeMemory(entries: LogEntry[]): MemoryAnalysis {
  const memDiffs = entries.filter(e => e.phase === 'memory_diff');
  let totalAdded = 0;
  const allEvents: string[] = [];
  const allTags: Set<string> = new Set();
  const growthCurve: number[] = [];

  for (const entry of memDiffs) {
    const d = entry.detail as {
      beforeCounts: Record<string, number>;
      afterCounts: Record<string, number>;
      added: Record<string, Array<{ event: string; emotionalTag: string }>>;
    };

    let addedThisEvent = 0;
    for (const mems of Object.values(d.added || {})) {
      for (const m of mems) {
        totalAdded++;
        addedThisEvent++;
        allEvents.push(m.event);
        if (m.emotionalTag) allTags.add(m.emotionalTag);
      }
    }
    growthCurve.push(addedThisEvent);
  }

  // 重复率：event 文本去重后的比例
  const uniqueEvents = new Set(allEvents);
  const duplicateRate = allEvents.length > 0 ? 1 - uniqueEvents.size / allEvents.length : 0;

  return {
    totalMemoriesAdded: totalAdded,
    duplicateRate: Math.round(duplicateRate * 100) / 100,
    emotionalTagDiversity: allTags.size,
    growthCurve,
  };
}

function printRuleIssues(issues: RuleIssue[]): void {
  console.log('\n===== 规则检测结果 =====\n');
  if (issues.length === 0) {
    console.log('未发现问题');
    return;
  }
  const grouped: Record<string, RuleIssue[]> = {};
  for (const issue of issues) {
    if (!grouped[issue.type]) grouped[issue.type] = [];
    grouped[issue.type].push(issue);
  }
  const LABELS: Record<string, string> = {
    historical_leak: '历史跳跃',
    naming_violation: '称谓错误',
    fabricated_event: '虚构事件',
    persona_violation: '人设违和',
    response_repetition: '回复重复',
    memory_not_used: '记忆未体现',
  };
  const P1_TYPES = ['historical_leak', 'naming_violation', 'fabricated_event', 'persona_violation'];
  const printOrder = [...P1_TYPES, 'response_repetition', 'memory_not_used'];
  for (const type of printOrder) {
    const list = grouped[type];
    if (!list) continue;
    const priority = P1_TYPES.includes(type) ? '⚠ P1' : 'P2';
    console.log(`[${priority}] ${LABELS[type] || type}: ${list.length} 处`);
    for (const issue of list.slice(0, 5)) {
      console.log(`  - ${issue.detail}${issue.recordIndex !== undefined ? ` (record #${issue.recordIndex})` : ''}`);
    }
    if (list.length > 5) console.log(`  ... 还有 ${list.length - 5} 处`);
  }
}

function printMemoryAnalysis(analysis: MemoryAnalysis): void {
  console.log('\n===== 记忆连贯性分析 =====\n');
  console.log(`新增记忆总数: ${analysis.totalMemoriesAdded}`);
  console.log(`重复率: ${(analysis.duplicateRate * 100).toFixed(0)}%`);
  console.log(`情感标签多样性: ${analysis.emotionalTagDiversity} 种`);
  console.log(`增长曲线 (每事件新增): [${analysis.growthCurve.join(', ')}]`);
}

// ===== Part 3: 涌现质量分析 =====

function classifyPromptRecord(r: PromptRecord): string {
  const systemMsg = r.messages.find(m => m.role === 'system')?.content || '';
  if (systemMsg.includes('叙事引擎') || systemMsg.includes('旁白')) return 'scene_dialogue';
  if (systemMsg.includes('记忆提取') || systemMsg.includes('memory')) return 'memory_extraction';
  if (systemMsg.includes('历史事件编剧') || systemMsg.includes('变体')) return 'event_generation';
  const userMsg = r.messages.find(m => m.role === 'user')?.content || '';
  if (systemMsg.includes('请按要求输出JSON') || userMsg.includes('stance') || userMsg.includes('pressureDeltas')) return 'npc_decision';
  return 'other';
}

function shannonEntropy(counts: Record<string, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const c of Object.values(counts)) {
    if (c === 0) continue;
    const p = c / total;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 100) / 100;
}

function computeEmergenceMetrics(entries: LogEntry[]): EmergenceMetrics {
  const ticks = entries.filter(e => e.phase === 'tick').map(e => ({ day: e.day, detail: e.detail as unknown as TickDetail }));
  const totalDays = entries.length > 0 ? Math.max(...entries.map(e => e.day)) + 1 : 0;

  const npcStanceDiversity: EmergenceMetrics['npcStanceDiversity'] = {};
  const npcActionRepetitionRate: Record<string, number> = {};
  const npcSilentDays: Record<string, number> = {};
  const npcStanceTransitions: Record<string, number> = {};

  // Collect per-NPC per-day data
  const npcIds = new Set<string>();
  const npcDayStance: Record<string, Record<number, string>> = {};
  const npcActions: Record<string, string[]> = {};
  const npcStanceCounts: Record<string, Record<string, number>> = {};
  const npcActiveDays: Record<string, Set<number>> = {};

  for (const t of ticks) {
    for (const a of t.detail.npcActions || []) {
      npcIds.add(a.who);
      if (!npcDayStance[a.who]) npcDayStance[a.who] = {};
      npcDayStance[a.who][t.day] = a.stance;
      if (!npcActions[a.who]) npcActions[a.who] = [];
      npcActions[a.who].push(a.action);
      if (!npcStanceCounts[a.who]) npcStanceCounts[a.who] = {};
      npcStanceCounts[a.who][a.stance] = (npcStanceCounts[a.who][a.stance] || 0) + 1;
      if (!npcActiveDays[a.who]) npcActiveDays[a.who] = new Set();
      npcActiveDays[a.who].add(t.day);
    }
  }

  for (const npcId of npcIds) {
    const counts = npcStanceCounts[npcId] || {};
    const totalActions = Object.values(counts).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [dominantStance, dominantCount] = sorted[0] || ['none', 0];

    npcStanceDiversity[npcId] = {
      distribution: counts,
      shannonEntropy: shannonEntropy(counts),
      dominantStance,
      dominantRatio: totalActions > 0 ? Math.round(dominantCount / totalActions * 100) / 100 : 0,
    };

    // Action repetition rate
    const actions = npcActions[npcId] || [];
    const uniqueActions = new Set(actions);
    npcActionRepetitionRate[npcId] = actions.length > 0
      ? Math.round((1 - uniqueActions.size / actions.length) * 100) / 100
      : 0;

    // Silent days
    npcSilentDays[npcId] = totalDays - (npcActiveDays[npcId]?.size || 0);

    // Stance transitions
    const dayStances = npcDayStance[npcId] || {};
    const sortedDays = Object.keys(dayStances).map(Number).sort((a, b) => a - b);
    let transitions = 0;
    for (let i = 1; i < sortedDays.length; i++) {
      if (dayStances[sortedDays[i]] !== dayStances[sortedDays[i - 1]]) transitions++;
    }
    npcStanceTransitions[npcId] = transitions;
  }

  // Event behavior shifts
  const eventDays: Array<{ day: number; skeletonId: string }> = [];
  for (const t of ticks) {
    if (t.detail.triggeredEvents && t.detail.triggeredEvents.length > 0) {
      for (const evt of t.detail.triggeredEvents) {
        const sid = typeof evt === 'string' ? evt : evt.skeletonId;
        eventDays.push({ day: t.day, skeletonId: sid });
      }
    }
  }

  const eventBehaviorShift: EmergenceMetrics['eventBehaviorShift'] = [];
  for (const { day: eventDay, skeletonId } of eventDays) {
    const shifts: Record<string, { before: string[]; after: string[] }> = {};
    for (const npcId of npcIds) {
      const dayStances = npcDayStance[npcId] || {};
      const before: string[] = [];
      const after: string[] = [];
      for (let d = Math.max(0, eventDay - 2); d < eventDay; d++) {
        if (dayStances[d]) before.push(dayStances[d]);
      }
      for (let d = eventDay + 1; d <= eventDay + 2; d++) {
        if (dayStances[d]) after.push(dayStances[d]);
      }
      shifts[npcId] = { before, after };
    }
    eventBehaviorShift.push({ eventDay, skeletonId, shifts });
  }

  return { npcStanceDiversity, npcActionRepetitionRate, npcSilentDays, npcStanceTransitions, eventBehaviorShift };
}

function printEmergenceMetrics(em: EmergenceMetrics, totalDays: number): void {
  console.log('\n===== 涌现质量分析 =====\n');

  console.log('NPC 行为多样性:');
  for (const [npcId, div] of Object.entries(em.npcStanceDiversity)) {
    const distStr = Object.entries(div.distribution)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${s}×${n}`)
      .join(', ');
    const warnings: string[] = [];
    if (div.shannonEntropy < 1.0) warnings.push('⚠ 熵过低');
    if (div.dominantRatio > 0.8) warnings.push('⚠ 主导stance>' + Math.round(div.dominantRatio * 100) + '%');
    if (em.npcActionRepetitionRate[npcId] > 0.6) warnings.push('⚠ 行动重复>' + Math.round(em.npcActionRepetitionRate[npcId] * 100) + '%');
    if (em.npcSilentDays[npcId] > totalDays * 0.5) warnings.push('⚠ 沉默>' + Math.round(totalDays * 0.5) + '天');

    console.log(`  ${npcId}: ${distStr} | 熵=${div.shannonEntropy} | 重复率=${Math.round(em.npcActionRepetitionRate[npcId] * 100)}% | 转变=${em.npcStanceTransitions[npcId]}次 | 沉默${em.npcSilentDays[npcId]}天${warnings.length > 0 ? ' ' + warnings.join(' ') : ''}`);
  }

  if (em.eventBehaviorShift.length > 0) {
    console.log('\n事件前后行为变化:');
    for (const shift of em.eventBehaviorShift) {
      const parts: string[] = [];
      for (const [npcId, { before, after }] of Object.entries(shift.shifts)) {
        const bStr = before.length > 0 ? before.join('/') : '沉默';
        const aStr = after.length > 0 ? after.join('/') : '沉默';
        const changed = bStr !== aStr;
        parts.push(`${npcId}: ${bStr}→${aStr}${changed ? '' : '（无变化）'}`);
      }
      console.log(`  [第${shift.eventDay}天 ${shift.skeletonId}] ${parts.join(', ')}`);
    }
  }
}

// ===== Main =====

const args = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith('--'));

if (!inputFile) {
  console.error('用法: npx tsx scripts/eval-playthrough.ts <log.json>');
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(inputFile), 'utf-8');
const entries: LogEntry[] = JSON.parse(raw);

console.log(`读取 ${entries.length} 条日志记录，来自 ${inputFile}`);

const metrics = computeMetrics(entries);
printMetrics(metrics);


const result: EvalResult = {
  inputFile,
  timestamp: new Date().toISOString(),
  metrics,
};

// Emergence quality analysis
const emergenceMetrics = computeEmergenceMetrics(entries);
result.emergenceMetrics = emergenceMetrics;
printEmergenceMetrics(emergenceMetrics, metrics.totalDays);

// Rule-based checks (always run if .prompts.jsonl exists)
const promptRecords = readPromptRecords(path.resolve(inputFile));
if (promptRecords.length > 0) {
  const typeDist: Record<string, number> = {};
  for (const r of promptRecords) {
    const t = classifyPromptRecord(r);
    typeDist[t] = (typeDist[t] || 0) + 1;
  }
  console.log(`LLM 调用分类: ${Object.entries(typeDist).map(([t, n]) => `${t}×${n}`).join(', ')}`);

  const ruleIssues = ruleBasedChecks(promptRecords, entries);
  result.ruleBasedIssues = ruleIssues;
  printRuleIssues(ruleIssues);
}

// Memory analysis (always run if memory_diff entries exist)
const memAnalysis = analyzeMemory(entries);
if (memAnalysis.totalMemoriesAdded > 0 || entries.some(e => e.phase === 'memory_diff')) {
  result.memoryAnalysis = memAnalysis;
  printMemoryAnalysis(memAnalysis);
}

// 保存结果
const outFile = inputFile.replace(/\.json$/, '.eval.json');
fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n评估结果已保存到 ${outFile}`);
