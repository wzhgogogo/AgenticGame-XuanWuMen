/**
 * 试玩日志评估脚本
 * 用法:
 *   npx tsx scripts/eval-playthrough.ts scripts/autoplay-log.json
 *   npx tsx scripts/eval-playthrough.ts scripts/autoplay-log.json --with-llm
 */
import * as fs from 'fs';
import * as path from 'path';

// ===== 读取 .env =====
const envPath = path.resolve(import.meta.dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
}

// ===== 类型 =====
interface LogEntry {
  day: number;
  dateStr: string;
  phase: 'activity' | 'tick' | 'pressure_snapshot';
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

interface LlmScore {
  dimension: string;
  score: number;
  reasoning: string;
}

interface EvalResult {
  inputFile: string;
  timestamp: string;
  metrics: QuantMetrics;
  llmEval?: {
    scores: LlmScore[];
    overallScore: number;
    summary: string;
  };
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

// ===== Part 2: LLM-as-Judge =====

async function llmEval(entries: LogEntry[], metrics: QuantMetrics): Promise<EvalResult['llmEval']> {
  const { OpenAIProvider } = await import('../src/engine/llm/openai');
  const { extractJson } = await import('../src/engine/jsonExtractor');

  const provider = new OpenAIProvider({
    provider: process.env.VITE_LLM_PROVIDER || 'openai',
    apiKey: process.env.VITE_LLM_API_KEY || '',
    model: process.env.VITE_LLM_MODEL || 'gpt-4o',
    baseUrl: process.env.VITE_LLM_BASE_URL || undefined,
  });

  // 构建精简的试玩摘要
  const ticks = entries.filter(e => e.phase === 'tick').map(e => ({ day: e.day, detail: e.detail as unknown as TickDetail }));

  const eventTimeline = ticks
    .filter(t => t.detail.triggeredEvents.length > 0)
    .map(t => `[第${t.day}天] ${t.detail.triggeredEvents.map(e => e.skeletonId).join(', ')}`)
    .join('\n') || '（无事件触发）';

  const npcTimeline = ticks
    .flatMap(t => t.detail.npcActions.map(a => `[第${t.day}天] ${a.who} [${a.stance}] ${a.action}: ${a.desc}`))
    .join('\n');

  const pressureSummary = Object.entries(metrics.pressureDelta)
    .map(([k, d]) => `${k}: ${metrics.pressureStart[k]}→${metrics.pressureEnd[k]}(${d > 0 ? '+' : ''}${d})`)
    .join('\n');

  const NPC_PROFILES = `
长孙无忌(changsun_wuji): 谨慎善谋，秦王妻兄，偏好 observe/intel/persuade/scheme，极少 confront，极端情况下可能 abandon
尉迟敬德(weichi_jingde): 刚猛忠勇，偏好 mobilize/confront/intel，耐心低时可能 breakdown（逼宫）
房玄龄(fang_xuanling): 稳重多智，偏好 observe/intel/scheme/persuade，不轻举妄动
stance 含义：observe=观望 / intel=情报 / persuade=温和进言 / scheme=暗中谋划 / confront=当面对抗 / mobilize=动员武力 / breakdown=失控逼宫 / abandon=出走决裂
`.trim();

  const prompt = `你是一个游戏设计评估专家。以下是一局"玄武门之变"LLM驱动涌现式历史游戏的试玩记录摘要。

游戏设定：玩家扮演秦王李世民，在武德九年的半年里做出抉择。7条压力轴驱动世界运转（0-100），NPC作为自主Agent每日决策，事件从压力积累中自然涌现。

===== NPC 人设 =====
${NPC_PROFILES}

===== 基本数据 =====
游戏天数: ${metrics.totalDays}
事件触发: ${metrics.eventCount}次

===== 事件时间线 =====
${eventTimeline}

===== NPC 决策序列 =====
${npcTimeline}

===== 压力轴变化 =====
${pressureSummary}

请从以下4个维度评估，每个维度1-5分，并给出reasoning（中文）：

1. 角色一致性 — 各NPC的决策序列是否符合上述人设？
2. 节奏合理性 — 事件触发和压力变化是否有"起承转合"感？还是平铺直叙/毫无变化？
3. 压力叙事弧 — 7条压力轴的变化趋势是否形成有意义的叙事弧线？
4. 涌现质量 — NPC决策和事件的组合是否产生了非模板化的、有趣的情节？

输出JSON：
{"scores":[{"dimension":"角色一致性","score":4,"reasoning":"..."},...],"overallScore":3.5,"summary":"一句话总评"}`;

  console.log('\n===== LLM-as-Judge 评估中... =====\n');

  let fullResponse = '';
  await provider.chat(
    [
      { role: 'system', content: '你是游戏设计评估专家。只输出JSON。' },
      { role: 'user', content: prompt },
    ],
    (chunk: string) => { fullResponse += chunk; },
  );

  const json = extractJson(fullResponse);
  if (!json) {
    console.error('LLM 返回无法解析:', fullResponse.slice(0, 500));
    return undefined;
  }

  const parsed = JSON.parse(json) as EvalResult['llmEval'];
  return parsed;
}

function printLlmEval(eval_: NonNullable<EvalResult['llmEval']>): void {
  console.log('\n===== LLM-as-Judge 评估结果 =====\n');
  for (const s of eval_.scores) {
    console.log(`[${s.score}/5] ${s.dimension}`);
    console.log(`  ${s.reasoning}\n`);
  }
  console.log(`综合评分: ${eval_.overallScore}/5`);
  console.log(`总评: ${eval_.summary}`);
}

// ===== Main =====

const args = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith('--'));
const withLlm = args.includes('--with-llm');

if (!inputFile) {
  console.error('用法: npx tsx scripts/eval-playthrough.ts <log.json> [--with-llm]');
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

if (withLlm) {
  const evalResult = await llmEval(entries, metrics);
  if (evalResult) {
    result.llmEval = evalResult;
    printLlmEval(evalResult);
  }
}

// 保存结果
const outFile = inputFile.replace(/\.json$/, '.eval.json');
fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n评估结果已保存到 ${outFile}`);
