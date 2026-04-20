/**
 * LLM 集成测试 — CLI 执行
 * 用法: npx tsx scripts/llm-integration-test.ts
 * 需要 .env 中配置 VITE_LLM_* 变量
 */
import * as fs from 'fs';
import * as path from 'path';

// 读取 .env
const envPath = path.resolve(import.meta.dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq > 0) {
    process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
}

import { OpenAIProvider } from '../src/engine/llm/openai';
import { buildNpcDecisionPrompt, buildEventGenerationPrompt } from '../src/engine/world/npcPromptBuilder';
import { extractJson } from '../src/engine/jsonExtractor';
import { createInitialWorldState } from '../src/engine/world/worldState';
import { extractSceneMemories } from '../src/engine/world/memoryExtractor';
import { intelligenceEvent } from '../src/data/skeletons/intelligenceEvent';
import type { NpcAgentState, NpcStance, PressureAxisId } from '../src/types/world';
import type { Character } from '../src/types';
import type { LLMProvider } from '../src/engine/llm/types';

const provider = new OpenAIProvider({
  provider: process.env.VITE_LLM_PROVIDER || 'openai',
  apiKey: process.env.VITE_LLM_API_KEY || '',
  model: process.env.VITE_LLM_MODEL || 'gpt-4o',
  baseUrl: process.env.VITE_LLM_BASE_URL || undefined,
});

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>) {
  process.stdout.write(`\n[${'TEST'}] ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    const elapsed = Date.now() - start;
    console.log(`PASS (${elapsed}ms)`);
    passed++;
  } catch (err: unknown) {
    const elapsed = Date.now() - start;
    console.log(`FAIL (${elapsed}ms)`);
    console.error(`  `, err instanceof Error ? err.message : err);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ===== Test 1: LLM 基础连通 =====
await runTest('LLM 基础连通（streaming chat）', async () => {
  let chunks = 0;
  const res = await provider.chat(
    [
      { role: 'system', content: '用一句话回答。' },
      { role: 'user', content: '唐太宗是谁？' },
    ],
    () => { chunks++; },
  );
  assert(res.content.length > 0, '回复不应为空');
  assert(chunks > 0, '应收到 streaming chunks');
  console.log(`  回复(${res.content.length}字, ${chunks}chunks): ${res.content.slice(0, 80)}...`);
});

// ===== Test 2: NPC 决策 =====
await runTest('NPC 决策（长孙无忌 stance intent）', async () => {
  const worldState = createInitialWorldState();
  const agentState: NpcAgentState = {
    characterId: 'changsun_wuji',
    patience: 60,
    alertness: 50,
    commitment: 80,
    currentPlan: null,
    recentActions: [],
    daysSinceLastAction: 2,
  };
  const stances: NpcStance[] = ['observe', 'intel', 'persuade', 'scheme'];
  const whitelist: PressureAxisId[] = ['court_opinion', 'succession_crisis', 'qinwangfu_desperation'];
  const prompt = buildNpcDecisionPrompt('changsun_wuji', '长孙无忌', agentState, stances, worldState, {
    escalationHints: ['储位局势渐紧，须筹谋'],
    impactWhitelist: whitelist,
  });

  let fullResponse = '';
  await provider.chat(
    [
      { role: 'system', content: '你是长孙无忌。严格按要求输出JSON：{"stance":"...","action":"...","description":"...","pressureDeltas":[...]}' },
      { role: 'user', content: prompt },
    ],
    (chunk: string) => { fullResponse += chunk; },
  );

  const json = extractJson(fullResponse);
  assert(json !== null, 'LLM 应返回可解析的 JSON');
  const parsed = JSON.parse(json!);
  assert(typeof parsed.stance === 'string', '应有 stance 字段');
  assert(stances.includes(parsed.stance), `stance 应在允许清单: ${stances.join(',')}，实际: ${parsed.stance}`);
  assert(typeof parsed.action === 'string' && parsed.action.length > 0, '应有非空 action 字段');
  assert(Array.isArray(parsed.pressureDeltas), '应有 pressureDeltas 数组');
  console.log(`  决策: [${parsed.stance}] ${parsed.action} — ${(parsed.description || '').slice(0, 60)}`);
  console.log(`  deltas: ${parsed.pressureDeltas.map((d: {axisId:string;delta:number}) => `${d.axisId}${d.delta >= 0 ? '+' : ''}${d.delta}`).join(', ')}`);
});

// ===== Test 3: 事件变体生成 =====
await runTest('事件变体生成（情报事件骨架）', async () => {
  const worldState = createInitialWorldState();
  worldState.pressureAxes.succession_crisis.value = 55;
  const skeleton = intelligenceEvent;
  const npcIds = ['changsun_wuji', 'fang_xuanling', 'weichi_jingde'];

  const prompt = buildEventGenerationPrompt(
    skeleton.category,
    skeleton.description,
    skeleton.constraints,
    skeleton.possibleLocations,
    skeleton.requiredRoles,
    skeleton.phaseSkeletons,
    skeleton.resolution,
    worldState,
    npcIds,
  );

  let fullResponse = '';
  await provider.chat(
    [
      { role: 'system', content: '你是一个历史事件编剧，专注于唐朝武德九年的宫廷政治。请严格按要求输出JSON。' },
      { role: 'user', content: prompt },
    ],
    (chunk: string) => { fullResponse += chunk; },
  );

  const json = extractJson(fullResponse);
  assert(json !== null, 'LLM 应返回可解析的 JSON');
  const parsed = JSON.parse(json!);
  assert(typeof parsed.name === 'string', '应有 name');
  assert(Array.isArray(parsed.phases), '应有 phases 数组');
  console.log(`  事件: ${parsed.name} (${parsed.phases?.length} phases)`);
});

// ===== Test 4: 记忆提取（新模块） =====
await runTest('记忆提取（memoryExtractor）', async () => {
  const mockCharacters: Character[] = [
    { id: 'changsun_wuji', name: '长孙无忌', role: '谋士', faction: 'qinwangfu', waitingText: '' } as Character,
    { id: 'weichi_jingde', name: '尉迟敬德', role: '武将', faction: 'qinwangfu', waitingText: '' } as Character,
  ];
  const summary = '长孙无忌向秦王密报：太子建成已联络齐王元吉，计划在昆明池设伏。尉迟敬德闻讯大怒，请求立即出兵，但被秦王劝阻。最终决定加强情报网，派人盯住东宫动向。';
  const npcIds = ['changsun_wuji', 'weichi_jingde'];

  const result = await extractSceneMemories(
    provider as LLMProvider,
    summary,
    npcIds,
    mockCharacters,
    'test_scene_001',
    '武德九年五月初三',
  );

  assert(typeof result === 'object', '应返回对象');
  const totalMemories = Object.values(result).flat().length;
  assert(totalMemories > 0, '应提取出至少 1 条记忆');
  for (const [charId, memories] of Object.entries(result)) {
    for (const mem of memories) {
      assert(typeof mem.event === 'string' && mem.event.length > 0, '记忆 event 不应为空');
      assert(mem.importance >= 1 && mem.importance <= 5, 'importance 应在 1-5');
      console.log(`  ${charId}: [${mem.emotionalTag}] ${mem.event} (重要度:${mem.importance})`);
    }
  }
});

// ===== 总结 =====
console.log(`\n${'='.repeat(40)}`);
console.log(`集成测试完成: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
