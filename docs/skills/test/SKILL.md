---
name: test
description: 跑玄武门 MVP 全量单测，汇报结果，发现问题时定位根因并修复
---

# Test — 玄武门 MVP 单测执行

## 执行步骤

1. 运行 `npx vitest run --exclude 'scripts/**'`，等待全部完成（scripts/autoplay.test.ts 要 10 分钟且需要 LLM，不在日常单测范围）
2. 如果全部通过：报告文件数、用例数、耗时
3. 如果有失败：
   - 列出失败用例名称和错误摘要
   - 判断是"测试代码过时"还是"被测模块有 bug"
   - 如果是测试代码过时（被测模块签名/字段名变更导致），直接修复测试
   - 如果是被测模块有 bug，报告给用户，不自行修改生产代码

## 测试文件清单（最后更新 2026-04-27）

| 文件 | 被测模块 | 用例数 | Layer |
|------|----------|--------|-------|
| `src/engine/jsonExtractor.test.ts` | JSON 提取器 | 20 | L1 |
| `src/engine/world/__tests__/pressure.test.ts` | 压力系统（含 applyOutcomeEffects） | 23 | L1 |
| `src/engine/world/__tests__/calendar.test.ts` | 日历系统 | 29 | L1 |
| `src/engine/world/__tests__/npcAgent.test.ts` | NPC Agent（含 stance 规则、once 消耗、6 NPC 决策规则） | 23 | L1 |
| `src/engine/world/__tests__/activities.test.ts` | 日常活动 | 14 | L1 |
| `src/data/skeletons/skeletons.test.ts` | 骨架模板（11 骨架结构断言 + outcome tagging） | 98 | L1 |
| `src/engine/world/__tests__/npcPromptBuilder.test.ts` | Prompt 构造（stance/白名单/情绪提示/axisId/NPC白名单） | 20 | L2 |
| `src/engine/world/__tests__/eventGenerator.test.ts` | 事件生成（mock LLM） | 14 | L2 |
| `src/engine/world/__tests__/eventRunner.test.ts` | 事件→场景适配 | 10 | L2 |
| `src/engine/world/__tests__/promptBuilder.test.ts` | 场景对话 prompt（叙事规则/日期注入/结局约束） | 8 | L2 |
| `src/engine/world/__tests__/worldSimulator.test.ts` | 叙事结局检测（detectNarrativeEnding 正则） | 7 | L1 |
| `src/engine/world/__tests__/playerActionLog.test.ts` | 玩家行为日志（appendPlayerAction / getRecentPlayerActions） | 7 | L1 |
| `src/engine/llm/__tests__/anthropic.test.ts` | Anthropic prompt caching（cacheBoundary 注入） | 5 | L2 |
| `src/engine/llm/__tests__/retry.test.ts` | callLLMWithRetry（重试/退避/abort/validator 失败） | 9 | L1 |
| `src/engine/llm/__tests__/validators.test.ts` | LLM 输出 validator（forbiddenWords/json/combine） | 15 | L1 |

**合计 15 个文件，302 个用例**。测试文件清单变更时同步更新这张表。

## 已知的坑

### 1. `pressureAxes` 不是 `pressure`
WorldState 里压力轴的字段名是 `pressureAxes`，不是 `pressure`。访问时用 `state.pressureAxes['succession_crisis']`。

### 2. 前置条件 params 用 `value` 不是 `threshold`
骨架的 `preconditions` 中 `pressure_above` 类型的阈值参数名是 `value`，不是 `threshold`。`threshold` 只出现在 `pressureTriggers.axes` 里。

### 3. `checkEventTriggers` 最多返回 1 个事件
函数内部 `eligible.slice(0, 1)`，防止事件洪泛。测试只能断言返回 0 或 1 个，不能期望返回多个。

### 4. tailwindcss vite 插件竞争（已修复）
`@tailwindcss/vite` 插件在 vitest 中会触发 `configResolved` 竞争，报 `Cannot read properties of undefined (reading 'config')`。`vite.config.ts` 改为 async 函数形式，在 `!process.env.VITEST` 时才动态 import 该插件。如果重现，检查是否有人把 tailwindcss import 改回了顶层静态 import。

### 5. `import.meta.glob` 依赖链
`src/data/characters/memoryLoader.ts` 用了 Vite 专属的 `import.meta.glob`。如果测试文件的 import 链碰到这个模块会报错。目前所有测试都不涉及 characters 模块，新增测试时注意绕开。

### 6. `createInitialWorldState` 依赖默认配置
测试中用 `createInitialWorldState()` 构造状态时，压力初始值来自 `DEFAULT_PRESSURE_CONFIGS`。如果改了默认值（如 velocity 翻倍），不会影响现有测试——因为测试要么自建 axis，要么只断言相对变化。但如果新测试断言绝对值，需要注意跟配置同步。

### 7. Stance 系统（v3.4.2 更新：8 → 19）+ NPC 扩展（v3.4.4：3 → 6 NPC）
NPC 决策管线使用 19 个细粒度 `NpcStance`（observe/plant_spy/counterspy/analyze/advise/remonstrate/lobby/scheme/coordinate/strategize/drill/rally/patrol/pressure/defy/assassinate/capture/breakdown/abandon）。
- `NpcDecisionRule.allowedStances` 使用这 19 个 stance
- `NpcAction` 字段：`stance` + `action`（自由文本）+ 可选 `target/degradeLevel`
- v3.4.4 新增 3 个完整 NPC（建成/元吉/李渊），各有 4-5 个规则档位（npcDecisionRules.ts）
- 元吉独有 `lyj_fishing` 档（二虎相争算计）；李渊独有 `lyy_balance_act` 档（挑动较弱方）
- 写新测试时用 v3.4.2 stance 术语，不要用旧的 actionType/persuade/confront/mobilize

### 10. OutcomeEffect 与 PressureModifier 并存
v3.4.4 新增 `OutcomeEffect`（discriminated union: pressure/loseNpc/injureNpc/loseOffice/confiscateMilitary/flag），骨架的 `baseOutcomeEffects` 使用 `TaggedOutcomeEffect[]`。原 `PressureModifier` 保留不动（NpcAction.pressureEffects 等处仍用）。测试骨架时注意断言 `tag` 字段（success/partial/failure/disaster）。

### 11. NpcAgentState.status 字段
v3.4.4 新增 `status: 'active' | 'exiled' | 'imprisoned' | 'deceased' | 'dispatched'`。worldSimulator 在决策阶段过滤非 active NPC。测试中构造 NpcAgentState 时需包含 status 字段。

### 12. FlagKey 白名单校验
`src/data/flags.ts` 定义 FlagKey 枚举，`applyOutcomeEffects` 对 flag-kind outcome 强制校验。测试 flag 相关逻辑时只能使用枚举内的 key。

### 13. endingResolver 优先级链
`endingResolver.ts` 的 `resolveEnding(state)` 按 F5 → E3 → E1 → F1 → N1 优先级判定结局。测试结局判定时注意优先级顺序——同时满足 E1 和 E3 条件时 E3 胜出。

### 8. scripts/llm-integration-test.ts 会过时
这个脚本直接实例化 `NpcAgentState`、传 stance/action 清单给 prompt builder。NpcAgentState 字段变更或 prompt builder 签名变更时容易漏改。冒烟失败时先看它的 import 和字段是否跟上了 types/world.ts。

### 9. eventGenerator.test.ts 的 stderr 输出是正常的
`returns null on LLM exception` 等用例故意触发异常测兜底路径，stderr 会打错误但测试 PASS，**不是 bug**。

## 新增测试的原则

- 只测纯函数 / 纯数据，不碰 LLM 调用（LLM 路径用冒烟测试覆盖）
- 每个 describe 块必须有 "is pure — does not mutate input" 测试
- 骨架模板测试用 `ALL_SKELETONS.forEach` 批量验证结构，再逐个断言关键业务值
- 集成测试用 `createInitialWorldState()` + 手动 set 压力值，传入真实骨架
- stance 相关测试：验证规则档位命中、stance 去重、once 消耗、escalationHints 收集
