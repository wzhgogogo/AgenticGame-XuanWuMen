/**
 * 自动跑局脚本 — 用 vitest 驱动，收集 LLM 输出日志供人工审查。
 *
 * 用法：
 *   VITE_LLM_API_KEY=xxx VITE_LLM_PROVIDER=deepseek VITE_LLM_MODEL=deepseek-chat \
 *     npx vitest run scripts/autoplay.test.ts --reporter=verbose
 *
 * 输出：scripts/autoplay-log.json
 */

import { describe, it, beforeAll, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// --- mock localStorage（worldState.ts 需要） ---
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { for (const k of Object.keys(storage)) delete storage[k]; },
  get length() { return Object.keys(storage).length; },
  key: (i: number) => Object.keys(storage)[i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
// window.location.hostname for loadEnvConfig safety check
Object.defineProperty(globalThis, 'window', {
  value: { location: { hostname: 'localhost' } },
});

// --- 延迟 import（需要先 mock） ---
const { WorldSimulator } = await import('../src/engine/world/worldSimulator');
const { createLLMProvider } = await import('../src/engine/llm');
const { characters, getPlayerCharacter, getNpcCharacters } = await import('../src/data/characters');
const { ALL_ACTIVITIES } = await import('../src/engine/world/activities');
const { SceneManager } = await import('../src/engine/sceneManager');

// --- 速率限制包装（Gemini 20 RPM；并行跑多局时用 AUTOPLAY_RPM 分配） ---
const RPM_LIMIT = Number(process.env.AUTOPLAY_RPM) || 13;
const WINDOW_MS = 60_000;
const callTimestamps: number[] = [];

function rateLimitedProvider(base: ReturnType<typeof createLLMProvider>): ReturnType<typeof createLLMProvider> {
  return {
    chat: async (messages, onChunk?, signal?) => {
      const MAX_RETRIES = 5;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const now = Date.now();
        while (callTimestamps.length > 0 && callTimestamps[0] < now - WINDOW_MS) {
          callTimestamps.shift();
        }
        if (callTimestamps.length >= RPM_LIMIT) {
          const waitMs = callTimestamps[0] + WINDOW_MS - now + 500;
          console.log(`[rate-limit] 达到 ${RPM_LIMIT} RPM，等待 ${Math.round(waitMs / 1000)}s...`);
          await new Promise(r => setTimeout(r, waitMs));
        }
        callTimestamps.push(Date.now());
        try {
          return await base.chat(messages, onChunk, signal);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const is429 = msg.includes('429') || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many');
          if (is429 && attempt < MAX_RETRIES) {
            const backoff = Math.min(30_000, (2 ** attempt) * 5_000);
            console.log(`[rate-limit] 429 detected, retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(backoff / 1000)}s...`);
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
          throw err;
        }
      }
      throw new Error('unreachable');
    },
  };
}

function loggingProvider(base: ReturnType<typeof createLLMProvider>): ReturnType<typeof createLLMProvider> {
  return {
    chat: async (messages, onChunk?, signal?) => {
      const result = await base.chat(messages, onChunk, signal);
      const record = {
        ts: Date.now(),
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        response: result.content,
      };
      fs.appendFileSync(promptsPath, JSON.stringify(record) + '\n');
      return result;
    },
  };
}

// --- 玩家输入池 ---
const PLAYER_INPUTS = [
  // 观望/探询
  '继续', '你怎么看', '你们怎么想', '有什么建议', '说下去', '然后呢',
  '此事你怎么看', '诸位以为如何', '细说',
  // 散场/回避
  '退下', '先下去吧', '容后再议', '今日到此为止', '你先退下', '散了吧', '改日再议',
  // 决断/行动
  '动手吧', '我决定了', '行动', '出击', '就这么办', '传令下去', '不再犹豫', '准备动手',
  // 消极/放弃
  '我累了', '不想干了', '我们放弃吧', '投降吧', '算了', '罢了', '随他去吧', '争来争去有何意义',
  // 对抗/质问
  '大哥如果我不喝呢', '你要杀我？', '你敢动我试试', '这是威胁吗', '你当我怕你？', '凭什么',
  // 申辩/抗旨
  '父王我不服', '儿臣冤枉', '请父王明察', '此事另有隐情', '容儿臣辩白',
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- 日志收集 ---
interface LogEntry {
  day: number;
  dateStr: string;
  phase: string;
  detail: Record<string, unknown>;
}

const logs: LogEntry[] = [];

function timestampSlug(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const logsDir = path.resolve(import.meta.dirname!, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
let outPath = '';

function flushLogs() {
  fs.writeFileSync(outPath, JSON.stringify(logs, null, 2), 'utf-8');
}

function log(day: number, dateStr: string, phase: string, detail: Record<string, unknown>) {
  const entry = { day, dateStr, phase, detail };
  logs.push(entry);
  console.log(`[Day ${day}] ${phase}:`, JSON.stringify(detail).slice(0, 200));
  flushLogs();
}

// --- 策略化活动选择 ---

type Strategy =
  | 'suppress_jiancheng'
  | 'suppress_emperor'
  | 'military_prep'
  | 'reactive_defense'
  | 'diplomacy'
  | 'endure'
  | 'abandon';

const STRATEGY: Strategy = (process.env.AUTOPLAY_STRATEGY as Strategy) || 'suppress_emperor';

outPath = path.resolve(logsDir, `${timestampSlug()}-${STRATEGY}-autoplay.json`);
const promptsPath = outPath.replace('.json', '.prompts.jsonl');

function actById(id: string) {
  return ALL_ACTIVITIES.find(a => a.id === id)!;
}

function pickFrom(ids: string[], count: number): string[] {
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickActivities(strategy: Strategy, state: { pressureAxes: Record<string, { value: number }> }) {
  const p = (id: string) => state.pressureAxes[id].value;

  let ids: string[];

  switch (strategy) {
    case 'suppress_jiancheng': {
      const pool = ['meet_officials', 'contact_insiders', 'summon_spy', 'counsel_xuanling'];
      ids = pickFrom(pool, 2);
      if (p('jiancheng_hostility') > 60 && !ids.includes('inspect_guards')) {
        ids[1] = 'inspect_guards';
      }
      break;
    }
    case 'suppress_emperor': {
      const pool = ['contact_insiders', 'train_troops', 'meet_officials', 'summon_spy'];
      ids = pickFrom(pool, 2);
      if (p('imperial_suspicion') > 50) {
        ids[1] = 'counsel_wuji';
      }
      break;
    }
    case 'military_prep': {
      const pool = ['train_troops', 'inspect_guards', 'reassure_jingde', 'contact_insiders'];
      ids = pickFrom(pool, 2);
      if (p('military_readiness') > 70) {
        ids[1] = randomPick(['counsel_wuji', 'counsel_xuanling']);
      }
      break;
    }
    case 'reactive_defense': {
      if (p('imperial_suspicion') > 50) {
        ids = pickFrom(['study', 'family_time', 'review_memorials'], 2);
      } else if (p('jiancheng_hostility') > 55) {
        ids = pickFrom(['inspect_guards', 'reassure_jingde', 'counsel_wuji'], 2);
      } else if (p('qinwangfu_desperation') > 50) {
        ids = pickFrom(['counsel_xuanling', 'reassure_jingde', 'family_time'], 2);
      } else {
        ids = pickFrom(['review_memorials', 'meet_officials', 'study'], 1);
      }
      break;
    }
    case 'diplomacy': {
      const pool = ['meet_officials', 'review_memorials', 'counsel_wuji', 'counsel_xuanling'];
      ids = pickFrom(pool, 2);
      if (p('imperial_suspicion') > 40) {
        ids = pickFrom(['review_memorials', 'study', 'meet_officials'], 2);
      } else if (p('imperial_suspicion') < 25) {
        ids[1] = 'contact_insiders';
      }
      break;
    }
    case 'endure': {
      const pool = ['study', 'family_time', 'review_memorials'];
      ids = pickFrom(pool, 2);
      if (p('qinwangfu_desperation') > 40) {
        ids[1] = 'counsel_xuanling';
      }
      break;
    }
    case 'abandon': {
      ids = pickFrom(['study', 'family_time'], 1);
      break;
    }
  }

  return ids.map(actById);
}

// --- 配置 ---
const MAX_DAYS = 30;
const MAX_SCENE_TURNS = 6;

describe('autoplay', () => {
  let simulator: InstanceType<typeof WorldSimulator>;
  let provider: ReturnType<typeof createLLMProvider>;
  const player = getPlayerCharacter();
  const npcs = getNpcCharacters();

  beforeAll(() => {
    const config = {
      provider: process.env.VITE_LLM_PROVIDER || 'openai',
      apiKey: process.env.VITE_LLM_API_KEY || '',
      model: process.env.VITE_LLM_MODEL || '',
      baseUrl: process.env.VITE_LLM_BASE_URL || undefined,
    };
    if (!config.apiKey) throw new Error('需要设置 VITE_LLM_API_KEY 环境变量');
    provider = loggingProvider(rateLimitedProvider(createLLMProvider(config)));
  });

  it('runs automated playthrough', { timeout: 7_200_000 }, async () => {
    simulator = new WorldSimulator(provider, characters, player);

    // 监听状态
    let currentMode = 'title_screen' as string;
    simulator.subscribe((_state, mode) => { currentMode = mode; });
    simulator.startGame();
    log(0, '', 'config', { strategy: STRATEGY, maxDays: MAX_DAYS });

    for (let day = 0; day < MAX_DAYS; day++) {
      const state = simulator.getState();
      const cal = state.calendar;
      const dateStr = `武德九年${cal.month}月${cal.day}日`;

      // 1. 策略化选活动
      const activities = pickActivities(STRATEGY, state);
      for (const activity of activities) {
        const flavor = simulator.applyActivity(activity);
        log(day, dateStr, 'activity', { id: activity.id, name: activity.name, flavor });
      }

      // 2. 结束今天
      const tickResult = await simulator.endDay();
      log(day, dateStr, 'tick', {
        pressureChanges: tickResult.pressureChanges.length,
        npcActions: tickResult.npcActions.map(a => ({
          who: a.characterId,
          stance: a.stance,
          action: a.action,
          desc: a.description,
          deltas: a.pressureEffects.map(e => `${e.axisId}${e.delta >= 0 ? '+' : ''}${e.delta}`),
          degrade: a.degradeLevel ?? 0,
        })),
        triggeredEvents: tickResult.triggeredEvents.map(e => e.skeletonId),
        briefing: tickResult.dailyBriefing,
      });

      // 3. 检查 game over
      if (currentMode === 'game_over') {
        log(day, dateStr, 'game_over', { ending: simulator.getEndingType() });
        break;
      }

      // 4. 从日报继续
      await simulator.proceedFromBriefing();

      // 5. 如果进入了事件场景，自动打完
      if (currentMode === 'event_scene') {
        const sceneConfig = simulator.getEventSceneConfig();
        if (sceneConfig) {
          const memBefore: Record<string, unknown[]> = JSON.parse(JSON.stringify(simulator.getState().characterMemories));

          const sceneNpcs = npcs.filter(c => sceneConfig.activeNpcIds?.includes(c.id));
          const sm = new SceneManager(provider, sceneConfig, sceneNpcs, player);
          await sm.startGame();

          log(day, dateStr, 'scene_start', {
            sceneName: sceneConfig.id,
            narratorIntro: sceneConfig.narratorIntro?.slice(0, 100),
          });

          // 自动输入
          for (let turn = 0; turn < MAX_SCENE_TURNS; turn++) {
            const smState = sm.getState();
            if (smState.status !== 'playing') break;

            const input = randomPick(PLAYER_INPUTS);
            log(day, dateStr, 'player_input', { turn, input });

            await sm.submitPlayerAction(input);

            const afterState = sm.getState();
            // 记录最新对话
            const lastEntries = afterState.dialogueHistory.slice(-3);
            log(day, dateStr, 'scene_dialogue', {
              turn,
              entries: lastEntries.map(e => ({
                type: e.type,
                speaker: e.speakerName || e.type,
                content: e.content.slice(0, 150),
              })),
            });

            if (afterState.status === 'ending') {
              log(day, dateStr, 'scene_ending', { endingText: afterState.endingText?.slice(0, 300) });
              break;
            }
          }

          // 获取结束文本
          const finalState = sm.getState();
          const summary = finalState.endingText || '场景结束，未获得结局文本。';
          const chosenOutcome = finalState.chosenOutcome || 'success';
          await simulator.handleEventEnd(summary, chosenOutcome);

          // 记忆 diff
          const memAfter = simulator.getState().characterMemories as Record<string, unknown[]>;
          const memAdded: Record<string, unknown[]> = {};
          for (const [charId, mems] of Object.entries(memAfter)) {
            const prevLen = (memBefore[charId] || []).length;
            const newMems = (mems as unknown[]).slice(prevLen);
            if (newMems.length > 0) memAdded[charId] = newMems;
          }
          log(day, dateStr, 'memory_diff', {
            beforeCounts: Object.fromEntries(Object.entries(memBefore).map(([k, v]) => [k, v.length])),
            afterCounts: Object.fromEntries(Object.entries(memAfter).map(([k, v]) => [k, v.length])),
            added: Object.fromEntries(
              Object.entries(memAdded).map(([k, v]) => [k, v.map((m: any) => ({ event: m.event, emotionalTag: m.emotionalTag }))])
            ),
          });

          log(day, dateStr, 'event_end', {
            summary: summary.slice(0, 300),
            chosenOutcome,
            eventLog: simulator.getState().eventLog.map(e => ({
              name: e.name,
              day: e.day,
              summary: e.summary.slice(0, 200),
            })),
          });
        }
      }

      // 检查 game over（事件后也可能触发）
      if (currentMode === 'game_over') {
        log(day, dateStr, 'game_over', { ending: simulator.getEndingType() });
        break;
      }

      // 记录当天结束时的压力快照
      const endState = simulator.getState();
      log(day, dateStr, 'pressure_snapshot', {
        axes: Object.fromEntries(
          Object.entries(endState.pressureAxes).map(([k, v]) => [k, Math.round((v as { value: number }).value)])
        ),
        playerActions: (endState.playerActionLog ?? []).slice(-3).map(a => ({
          type: a.type, detail: 'detail' in a ? a.detail : undefined, day: a.day,
        })),
      });
    }

    // 写日志
    flushLogs();
    console.log(`\n日志已写入: ${outPath} (${logs.length} 条)`);

    expect(logs.length).toBeGreaterThan(0);
  }, 3_600_000); // 60 分钟超时
});
