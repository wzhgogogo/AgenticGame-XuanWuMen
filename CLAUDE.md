# CLAUDE.md — 项目指引

## 项目概述

玄武门之变 v3.4.2：LLM 驱动的涌现式历史互动叙事游戏。玩家扮演秦王李世民，在武德九年的半年博弈中做出抉择。

核心设计：没有固定剧情线。7 条压力轴驱动世界运转，NPC 作为自主 Agent 每日决策，事件从压力积累中自然涌现。

## 构建与运行

```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # tsc -b && vite build（生产构建）
npm run lint     # ESLint
```

需要 `.env` 配置 LLM API：`VITE_LLM_API_KEY`、`VITE_LLM_PROVIDER`、`VITE_LLM_MODEL`、`VITE_LLM_BASE_URL`（可选）

### 测试

```bash
npx vitest run                              # 全量单测（220 用例）
npx vitest run --exclude 'scripts/**'       # 只跑 src 下的单测
npx vitest run scripts/autoplay.test.ts     # 自动跑局（需要 LLM API，⚠️ 当前不稳定）
npx tsx scripts/eval-playthrough.ts <log>   # 评估跑局日志（log 在 scripts/logs/ 下，按时间戳命名）
npx tsx scripts/llm-integration-test.ts     # LLM 接口冒烟测试
```

## 架构核心

### 状态机流转

```
title_screen → daily_activities → daily_briefing → [event_scene] → daily_activities → ... → game_over
```

- `WorldSimulator`（src/engine/world/worldSimulator.ts）驱动整个流程
- `App.tsx` 订阅 WorldSimulator 状态，按 GameMode 渲染不同组件

### 压力系统

7 条压力轴（src/engine/world/pressure.ts），各轴 0-100：
- succession_crisis、jiancheng_hostility、yuanji_ambition、court_opinion、qinwangfu_desperation、imperial_suspicion、military_readiness
- 每轴有 value / velocity / baseline / floor / ceiling / decayRate
- 三通道变化：时间漂移 tick（确定性）、NPC 行为、玩家活动

### 事件系统

两层架构：
- **骨架模板**（src/data/skeletons/）：8 种事件类型，定义结构、触发条件、约束
- **LLM 变体生成**（src/engine/world/eventGenerator.ts）：根据当前世界状态填充具体细节
- **场景适配**（src/engine/world/eventRunner.ts）：EventInstance → SceneConfig，复用现有 SceneManager

### NPC Agent

两阶段管线：
1. 确定性规则过滤（src/data/agents/npcDecisionRules.ts）
2. LLM 推理（src/engine/world/npcPromptBuilder.ts，~300 token 紧凑 prompt）

多 NPC 并行决策：worldSimulator.ts 中分三阶段——确定性规则过滤（串行）→ LLM 决策（Promise.all 并行）→ 结果合并（串行）。

三个幕后 Agent（建成/元吉/李渊，src/data/agents/offstageAgents.ts）：纯确定性每日压力贡献，不消耗 LLM token。

### 约束中枢

src/data/promptConstraints.ts 是所有 LLM prompt 约束的唯一来源：
- **历史事实层**（HISTORICAL_CONTEXT / NAMING_RULES）：人物表、禁用词、称谓规则，永远不变
- **叙事节奏层**：由 pressure.ts `getNarrativeIntensity()` 动态返回 4 档烈度约束
- `buildConstraintBlock(dateStr, intensityConstraint, detailed?)` 统一拼装，消费方不自己拼字符串
- `detailed=true`（场景对话）注入完整称谓规则，`false`（NPC 决策/事件生成）用紧凑版

### 跨场景记忆

- src/engine/world/memoryExtractor.ts：场景结束后 LLM 提取 NPC 记忆（~200-300 tokens）
- WorldState.characterMemories 持久化，注入 NPC 决策 prompt（最近 5 条）和场景对话 prompt
- 每角色上限 10 条，超出保留最新

### 日常活动

src/engine/world/activities.ts：5 类 12 项活动（治政/军务/情报/社交/个人），每项有压力效果和场景文案（~50 条 flavorText）。活动选择期间后台异步跑 NPC agent LLM 调用，掩盖延迟。

## 关键模块导航

| 要改什么 | 去哪里 |
|---------|--------|
| 压力参数/公式 | src/engine/world/pressure.ts + src/engine/world/worldState.ts（初始值） |
| 事件类型/触发条件 | src/data/skeletons/*.ts |
| NPC 决策规则 | src/data/agents/npcDecisionRules.ts |
| 幕后角色每日效果 | src/data/agents/offstageAgents.ts |
| 日常活动内容/效果 | src/engine/world/activities.ts |
| LLM prompt 约束/称谓/禁用词 | src/data/promptConstraints.ts |
| 场景对话 prompt | src/engine/world/promptBuilder.ts |
| NPC 决策 prompt | src/engine/world/npcPromptBuilder.ts |
| 事件变体生成 prompt | src/engine/world/eventGenerator.ts |
| 跨场景记忆提取 | src/engine/world/memoryExtractor.ts |
| 前端状态机/路由 | src/App.tsx |
| 存档/读档 | src/engine/world/worldState.ts（localStorage） |
| 角色数据/记忆 | src/data/characters/*.ts + memories/*.md |
| 类型定义 | src/types/index.ts（基础）+ src/types/world.ts（世界模拟） |
| 调试日志 | src/engine/debugLog.ts |
| 自动跑局/评估 | scripts/*.ts |

## 技术约定

### TypeScript
- tsconfig.app.json 启用了 `noUnusedLocals: true` 和 `noUnusedParameters: true`，未使用的变量/参数会导致构建失败
- 不要用下划线前缀 `_var` 回避——要么用它，要么删它

### Vite 限制
- `import.meta.glob` 只有在 Vite 下才能跑（src/data/characters/memoryLoader.ts 用了它）
- 纯 Node/tsx 环境下无法 import characters 模块，测试时需避开这条依赖链
- vitest 中 `import.meta.env.DEV` 可用（debugLog.ts 用了它）

### LLM 接口
- `LLMProvider.chat(messages: LLMMessage[], onChunk?: (text: string) => void, signal?: AbortSignal): Promise<LLMResponse>`
- 支持 6 家 provider（OpenAI / Anthropic / DeepSeek / Moonshot / 通义千问 / 智谱），全部走 OpenAI 兼容接口或 Anthropic 原生接口

### NPC ID 命名
- 尉迟敬德 = `weichi_jingde`（不是 yuchi）
- 长孙无忌 = `changsun_wuji`
- 房玄龄 = `fang_xuanling`

### 存档
- 自动存档到 localStorage，但 event_scene 模式下**不存**（SceneManager 状态不可序列化）
- worldState.ts 中的 `saveWorldState` / `loadWorldState` / `clearSavedWorldState`
- SAVE_KEY = `'xuanwumen_world_state'`

## 已废弃（保留但不再使用）

- `src/data/timelines/` — v2.0 固定时间线（整个目录）
- `src/data/scenes/*.ts` — v2.0 固定场景（可作为骨架 fallback 变体的参考）
- `src/data/historicalConstraint.ts` — 已合并到 promptConstraints.ts
- `src/components/NarratorPanel.tsx` — 已不再被 GameScene 引用
- `src/components/DialogueFlow.tsx` — 被 DialoguePanel 替代

## 已删除（v3.4.1 清理）

- `src/engine/campaignManager.ts` — 被 WorldSimulator 替代
- `src/engine/outcomeBuilder.ts` — v2.0 场景结果提取，被 memoryExtractor 替代
- `src/engine/__test__promptBuilder.ts` — 废弃冒烟测试，引用已删除的 data/scenes

## 已知待改进

- ⚠️ autoplay.test.ts 在 vitest Windows 环境下运行不稳定（模块加载竞争），待排查
- 骨架 fallback 变体尚未实现（LLM 生成失败时无兜底）
- LLM 变体生成无重试逻辑
- worldSimulator.ts (755行) 和 activities.ts (783行) 超 arch-guard 300行限制，待拆分
- buildSystemPrompt 函数 ~80 行，超 arch-guard 50行限制
- 只有 3 个 NPC 有决策规则，其余 NPC 在 tick 中被跳过
- EventSceneWrapper 的 setTimeout 未在 unmount 时清理
- LLM 等待时间长是最大体验问题，需探索预加载/缓存/prompt 压缩

## v3.4.2 变更摘要

### NPC Stance 精细化（8 → 19）
- 19 个 stance 区分文臣/武将行为模式，5 档 pressure cap
- 三个 NPC 决策规则全面重写（npcDecisionRules.ts），每人 4-5 个紧迫度档位

### Eval 检测强化
- 禁用词 12 → 28，称谓规则 2 → 6，新增虚构事件检测 + 人设一致性检测
- P1/P2 分级输出：P1（历史跳跃/称谓/虚构/人设）优先，P2（重复/记忆）参考
- eval 不再调 LLM，全部纯规则检测

### 自动跑局策略化
- `AUTOPLAY_STRATEGY` / `AUTOPLAY_RPM` 环境变量

### 当前重点
1. **Eval 聚焦幻觉/硬错误**（P1 检测），涌现放 P2 慢慢调
2. **UI 打磨**：提升游戏感
3. **等待时间优化**：LLM 调用延迟
